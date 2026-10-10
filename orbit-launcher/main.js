class View {
  app;
  containerEl;
  /**
   * When true, the shell renders this view full-bleed and hides its own chrome
   * (mobile top bar + tabs). Used by the launcher home, which must look like a
   * clean Android home screen with no Orbit menu — you reach the Orbit app's
   * chrome by opening Orbit itself, not from the launcher.
   */
  chromeless = false;
  /**
   * Whether this view may rotate with the device. Default false: the shell locks
   * portrait while a plugin view is active (a launcher/picker shouldn't rotate).
   * A view that wants landscape (e.g. a video player) sets this true. Handled
   * centrally in the shell, so it applies to remote store plugins too.
   */
  allowRotation = false;
  constructor(app) {
    this.app = app;
  }
}
class Plugin {
  app;
  manifest;
  _navItems = [];
  _commands = [];
  _settingTabs = [];
  _views = /* @__PURE__ */ new Map();
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
  }
  addNavigationItem(item) {
    this._navItems.push(item);
    this.app.navigation.register({
      ...item,
      pluginId: this.manifest.id,
      viewId: item.viewId ?? item.id
    });
  }
  addCommand(command) {
    const prefixed = { ...command, id: `${this.manifest.id}:${command.id}` };
    this._commands.push(prefixed);
    this.app.commands.register(prefixed);
  }
  addSettingTab(tab) {
    this._settingTabs.push(tab);
  }
  registerView(id, factory) {
    this._views.set(id, factory);
    this.app.workspace.registerView(id, factory);
  }
  getNavigationItems() {
    return this._navItems;
  }
  getSettingTabs() {
    return this._settingTabs;
  }
  cleanup() {
    for (const cmd of this._commands) {
      this.app.commands.unregister(cmd.id);
    }
    this.app.navigation.unregisterByPlugin(this.manifest.id);
    this._navItems = [];
    this._commands = [];
    this._settingTabs = [];
    this._views.clear();
  }
}

const DESIGN_COLORS = [
  { key: "accent", label: "Akzent", role: "primary" },
  { key: "color-secondary", label: "Sekundär", role: "secondary" },
  { key: "color-tertiary", label: "Tertiär", role: "tertiary" },
  { key: "text", label: "Schriftfarbe", role: "onSurface" },
  { key: "bg-elevated", label: "Oberfläche", role: "surfaceVariant" },
  { key: "bg", label: "Hintergrund", role: "surface" }
];

const DEV = false;

// Store the references to globals in case someone tries to monkey patch these, causing the below
// to de-opt (this occurs often when using popular extensions).
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;

const noop = () => {};

/** @param {Array<() => void>} arr */
function run_all(arr) {
	for (var i = 0; i < arr.length; i++) {
		arr[i]();
	}
}

/**
 * TODO replace with Promise.withResolvers once supported widely enough
 * @template [T=void]
 */
function deferred() {
	/** @type {(value: T) => void} */
	var resolve;

	/** @type {(reason: any) => void} */
	var reject;

	/** @type {Promise<T>} */
	var promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	// @ts-expect-error
	return { promise, resolve, reject };
}

// General flags
const DERIVED = 1 << 1;
const EFFECT = 1 << 2;
const RENDER_EFFECT = 1 << 3;
/**
 * An effect that does not destroy its child effects when it reruns.
 * Runs as part of render effects, i.e. not eagerly as part of tree traversal or effect flushing.
 */
const MANAGED_EFFECT = 1 << 24;
/**
 * An effect that does not destroy its child effects when it reruns (like MANAGED_EFFECT).
 * Runs eagerly as part of tree traversal or effect flushing.
 */
const BLOCK_EFFECT = 1 << 4;
const BRANCH_EFFECT = 1 << 5;
const ROOT_EFFECT = 1 << 6;
const BOUNDARY_EFFECT = 1 << 7;
/**
 * Set on the effect that `pause_effect` was called on, i.e. the root of a paused subtree,
 * as opposed to its descendants which are merely `INERT`. This allows `resume_effect` on
 * an ancestor to skip subtrees that were paused for their own reasons (such as a block
 * whose condition is still false) rather than resurrecting them
 */
const PAUSED = 1 << 8;
/**
 * Indicates that a reaction is connected to an effect root — either it is an effect,
 * or it is a derived that is depended on by at least one effect. If a derived has
 * no dependents, we can disconnect it from the graph, allowing it to either be
 * GC'd or reconnected later if an effect comes to depend on it again
 */
const CONNECTED = 1 << 9;
const CLEAN = 1 << 10;
const DIRTY = 1 << 11;
const MAYBE_DIRTY = 1 << 12;
const INERT = 1 << 13;
const DESTROYED = 1 << 14;
/** Set once a reaction has run for the first time */
const REACTION_RAN = 1 << 15;
/** Effect is in the process of getting destroyed. Can be observed in child teardown functions */
const DESTROYING = 1 << 25;

// Flags exclusive to effects
/**
 * 'Transparent' effects do not create a transition boundary.
 * This is on a block effect 99% of the time but may also be on a branch effect if its parent block effect was pruned
 */
const EFFECT_TRANSPARENT = 1 << 16;
const EAGER_EFFECT = 1 << 17;
const HEAD_EFFECT = 1 << 18;
const EFFECT_PRESERVED = 1 << 19;
const USER_EFFECT = 1 << 20;
const EFFECT_OFFSCREEN = 1 << 25;

// Flags used for async
const REACTION_IS_UPDATING = 1 << 21;
const ASYNC = 1 << 22;

const ERROR_VALUE = 1 << 23;

const STATE_SYMBOL = Symbol('$state');
/** Marks component export objects, so that `proxy(...)` leaves them untouched */
const COMPONENT_SYMBOL = Symbol('component');
const LEGACY_PROPS = Symbol('legacy props');
const LOADING_ATTR_SYMBOL = Symbol('');
const ATTRIBUTES_CACHE = Symbol('attributes');
const CLASS_CACHE = Symbol('class');
const STYLE_CACHE = Symbol('style');
const TEXT_CACHE = Symbol('text');
const FORM_RESET_HANDLER = Symbol('form reset');

/** allow users to ignore aborted signal errors if `reason.name === 'StaleReactionError` */
const STALE_REACTION = new (class StaleReactionError extends Error {
	name = 'StaleReactionError';
	message = 'The reaction that called `getAbortSignal()` was re-run or destroyed';
})();

const IS_XHTML =
	// We gotta write it like this because after downleveling the pure comment may end up in the wrong location
	!!globalThis.document?.contentType &&
	/* @__PURE__ */ globalThis.document.contentType.includes('xml');

const EACH_ITEM_REACTIVE = 1;
const EACH_INDEX_REACTIVE = 1 << 1;
/** See EachBlock interface metadata.is_controlled for an explanation what this is */
const EACH_IS_CONTROLLED = 1 << 2;
const EACH_IS_ANIMATED = 1 << 3;
const EACH_ITEM_IMMUTABLE = 1 << 4;

const PROPS_IS_IMMUTABLE = 1;
const PROPS_IS_UPDATED = 1 << 2;
const PROPS_IS_BINDABLE = 1 << 3;
const PROPS_IS_LAZY_INITIAL = 1 << 4;

const TEMPLATE_FRAGMENT = 1;
const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
const HYDRATION_ERROR = {};

const UNINITIALIZED = Symbol('uninitialized');

const NAMESPACE_HTML = 'http://www.w3.org/1999/xhtml';

/* This file is generated by scripts/process-messages/index.js. Do not edit! */


/**
 * Reading a derived belonging to a now-destroyed effect may result in stale values
 */
function derived_inert() {
	{
		console.warn(`https://svelte.dev/e/derived_inert`);
	}
}

/**
 * A `<svelte:boundary>` `reset` function only resets the boundary the first time it is called
 */
function svelte_boundary_reset_noop() {
	{
		console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
	}
}

/** @import { Equals } from '#client' */

/** @type {Equals} */
function equals(value) {
	return value === this.v;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function safe_not_equal(a, b) {
	return a != a
		? b == b
		: a !== b || (a !== null && typeof a === 'object') || typeof a === 'function';
}

/** @type {Equals} */
function safe_equals(value) {
	return !safe_not_equal(value, this.v);
}

/* This file is generated by scripts/process-messages/index.js. Do not edit! */


/**
 * `%name%(...)` can only be used during component initialisation
 * @param {string} name
 * @returns {never}
 */
function lifecycle_outside_component(name) {
	{
		throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
	}
}

/* This file is generated by scripts/process-messages/index.js. Do not edit! */


/**
 * Cannot create a `$derived(...)` with an `await` expression outside of an effect tree
 * @returns {never}
 */
function async_derived_orphan() {
	{
		throw new Error(`https://svelte.dev/e/async_derived_orphan`);
	}
}

/**
 * Keyed each block has duplicate key `%value%` at indexes %a% and %b%
 * @param {string} a
 * @param {string} b
 * @param {string | undefined | null} [value]
 * @returns {never}
 */
function each_key_duplicate(a, b, value) {
	{
		throw new Error(`https://svelte.dev/e/each_key_duplicate`);
	}
}

/**
 * `%rune%` cannot be used inside an effect cleanup function
 * @param {string} rune
 * @returns {never}
 */
function effect_in_teardown(rune) {
	{
		throw new Error(`https://svelte.dev/e/effect_in_teardown`);
	}
}

/**
 * Effect cannot be created inside a `$derived` value that was not itself created inside an effect
 * @returns {never}
 */
function effect_in_unowned_derived() {
	{
		throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
	}
}

/**
 * `%rune%` can only be used inside an effect (e.g. during component initialisation)
 * @param {string} rune
 * @returns {never}
 */
function effect_orphan(rune) {
	{
		throw new Error(`https://svelte.dev/e/effect_orphan`);
	}
}

/**
 * Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
 * @returns {never}
 */
function effect_update_depth_exceeded() {
	{
		throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
	}
}

/**
 * Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value
 * @param {string} key
 * @returns {never}
 */
function props_invalid_value(key) {
	{
		throw new Error(`https://svelte.dev/e/props_invalid_value`);
	}
}

/**
 * Property descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.
 * @returns {never}
 */
function state_descriptors_fixed() {
	{
		throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
	}
}

/**
 * Cannot set prototype of `$state` object
 * @returns {never}
 */
function state_prototype_fixed() {
	{
		throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
	}
}

/**
 * Updating state inside `$derived(...)`, `$inspect(...)` or a template expression is forbidden. If the value should not be reactive, declare it without `$state`
 * @returns {never}
 */
function state_unsafe_mutation() {
	{
		throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
	}
}

/**
 * A `<svelte:boundary>` `reset` function cannot be called while an error is still being handled
 * @returns {never}
 */
function svelte_boundary_reset_onerror() {
	{
		throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
	}
}

/** True if experimental.async=true */
/** True if $inspect.trace is used */
let tracing_mode_flag = false;

/** @import { ComponentContext, DevStackEntry, Effect } from '#client' */

/** @type {ComponentContext | null} */
let component_context = null;

/** @param {ComponentContext | null} context */
function set_component_context(context) {
	component_context = context;
}

/**
 * @param {Record<string, unknown>} props
 * @param {any} runes
 * @param {Function} [fn]
 * @returns {void}
 */
function push(props, runes = false, fn) {
	component_context = {
		p: component_context,
		i: false,
		c: null,
		e: null,
		s: props,
		x: null,
		r: /** @type {Effect} */ (active_effect),
		l: null
	};
}

/**
 * @template {Record<string, any>} T
 * @param {T} [component]
 * @returns {T}
 */
function pop(component) {
	var context = /** @type {ComponentContext} */ (component_context);
	var effects = context.e;

	if (effects !== null) {
		context.e = null;

		for (var fn of effects) {
			create_user_effect(fn);
		}
	}

	context.i = true;

	component_context = context.p;

	return mark_as_component(component);
}

/**
 * Add a symbol to the object (or create one if undefined) to mark it as a component so it isn't proxified.
 * @param {any} component
 */
function mark_as_component(component = {}) {
	define_property(component, COMPONENT_SYMBOL, { value: true });
	return component;
}

/** @returns {boolean} */
function is_runes() {
	return true;
}

/** @type {Array<() => void>} */
let micro_tasks = [];

function run_micro_tasks() {
	var tasks = micro_tasks;
	micro_tasks = [];
	run_all(tasks);
}

/**
 * @param {() => void} fn
 */
function queue_micro_task(fn) {
	if (micro_tasks.length === 0 && !is_flushing_sync) {
		var tasks = micro_tasks;
		queueMicrotask(() => {
			// If this is false, a flushSync happened in the meantime. Do _not_ run new scheduled microtasks in that case
			// as the ordering of microtasks would be broken at that point - consider this case:
			// - queue_micro_task schedules microtask A to flush task X
			// - synchronously after, flushSync runs, processing task X
			// - synchronously after, some other microtask B is scheduled, but not through queue_micro_task but for example a Promise.resolve() in user code
			// - synchronously after, queue_micro_task schedules microtask C to flush task Y
			// - one tick later, microtask A now resolves, flushing task Y before microtask B, which is incorrect
			// This if check prevents that race condition (that realistically will only happen in tests)
			if (tasks === micro_tasks) run_micro_tasks();
		});
	}

	micro_tasks.push(fn);
}

/**
 * Synchronously run any queued tasks.
 */
function flush_tasks() {
	while (micro_tasks.length > 0) {
		run_micro_tasks();
	}
}

/** @import { Derived, Signal } from '#client' */

const STATUS_MASK = -7169;

/**
 * @param {Signal} signal
 * @param {number} status
 */
function set_signal_status(signal, status) {
	signal.f = (signal.f & STATUS_MASK) | status;
}

/**
 * Set a derived's status to CLEAN or MAYBE_DIRTY based on its connection state.
 * @param {Derived} derived
 */
function update_derived_status(derived) {
	// Only mark as MAYBE_DIRTY if disconnected and has dependencies.
	if ((derived.f & CONNECTED) !== 0 || derived.deps === null) {
		set_signal_status(derived, CLEAN);
	} else {
		set_signal_status(derived, MAYBE_DIRTY);
	}
}

/** @import { Effect } from '#client' */

/**
 * @param {Effect} effect
 * @param {Set<Effect>} dirty_effects
 * @param {Set<Effect>} maybe_dirty_effects
 */
function defer_effect(effect, dirty_effects, maybe_dirty_effects) {
	if ((effect.f & DIRTY) !== 0) {
		dirty_effects.add(effect);
	} else if ((effect.f & MAYBE_DIRTY) !== 0) {
		maybe_dirty_effects.add(effect);
	}

	// mark as clean so they get scheduled if they depend on pending async state
	set_signal_status(effect, CLEAN);
}

let listening_to_form_reset = false;

function add_form_reset_listener() {
	if (!listening_to_form_reset) {
		listening_to_form_reset = true;
		document.addEventListener(
			'reset',
			(evt) => {
				// Needs to happen one tick later or else the dom properties of the form
				// elements have not updated to their reset values yet
				Promise.resolve().then(() => {
					if (!evt.defaultPrevented) {
						for (const e of /**@type {HTMLFormElement} */ (evt.target).elements) {
							/** @type {any} */ (e)[FORM_RESET_HANDLER]?.();
						}
					}
				});
			},
			// In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
			{ capture: true }
		);
	}
}

/**
 * @template T
 * @param {() => T} fn
 */
function without_reactive_context(fn) {
	var previous_reaction = active_reaction;
	var previous_effect = active_effect;
	set_active_reaction(null);
	set_active_effect(null);
	try {
		return fn();
	} finally {
		set_active_reaction(previous_reaction);
		set_active_effect(previous_effect);
	}
}

/**
 * Listen to the given event, and then instantiate a global form reset listener if not already done,
 * to notify all bindings when the form is reset
 * @param {HTMLElement} element
 * @param {string} event
 * @param {(is_reset?: true) => void} handler
 * @param {(is_reset?: true) => void} [on_reset]
 */
function listen_to_event_and_reset_event(element, event, handler, on_reset = handler) {
	element.addEventListener(event, () => without_reactive_context(handler));
	const prev = /** @type {any} */ (element)[FORM_RESET_HANDLER];
	if (prev) {
		// special case for checkbox that can have multiple binds (group & checked)
		/** @type {any} */ (element)[FORM_RESET_HANDLER] = () => {
			prev();
			on_reset(true);
		};
	} else {
		/** @type {any} */ (element)[FORM_RESET_HANDLER] = () => on_reset(true);
	}

	add_form_reset_listener();
}

/** @import { Blocker, Effect, Source, Value } from '#client' */

/**
 * @param {Blocker[]} blockers
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {(values: Value[]) => any} fn
 */
function flatten(blockers, sync, async, fn) {
	const d = derived ;

	// Filter out already-settled blockers - no need to wait for them
	var pending = blockers.filter((b) => !b.settled);

	var deriveds = sync.map(d);

	if (async.length === 0 && pending.length === 0) {
		fn(deriveds);
		return;
	}

	var parent = /** @type {Effect} */ (active_effect);

	var restore = capture();
	var blocker_promise =
		pending.length === 1
			? pending[0].promise
			: pending.length > 1
				? Promise.all(pending.map((b) => b.promise))
				: null;

	/**
	 * @param {Source[]} async
	 */
	function finish(async) {
		if ((parent.f & DESTROYED) !== 0) {
			return;
		}

		restore();

		try {
			fn([...deriveds, ...async]);
		} catch (error) {
			invoke_error_boundary(error, parent);
		}

		unset_context();
	}

	var decrement_pending = increment_pending();

	// Fast path: blockers but no async expressions
	if (async.length === 0) {
		/** @type {Promise<any>} */ (blocker_promise).then(() => finish([])).finally(decrement_pending);
		return;
	}

	// Full path: has async expressions
	function run() {
		Promise.all(async.map((expression) => async_derived(expression)))
			.then(finish)
			.catch((error) => invoke_error_boundary(error, parent))
			.finally(decrement_pending);
	}

	if (blocker_promise) {
		blocker_promise.then(() => {
			if ((parent.f & DESTROYED) !== 0) {
				decrement_pending();
				return;
			}

			restore();
			run();
			unset_context();
		});
	} else {
		run();
	}
}

/**
 * Captures the current effect context so that we can restore it after
 * some asynchronous work has happened (so that e.g. `await a + b`
 * causes `b` to be registered as a dependency).
 */
function capture() {
	var previous_effect = /** @type {Effect} */ (active_effect);
	var previous_reaction = active_reaction;
	var previous_component_context = component_context;
	var previous_batch = /** @type {Batch} */ (current_batch);

	return function restore(activate_batch = true) {
		set_active_effect(previous_effect);
		set_active_reaction(previous_reaction);
		set_component_context(previous_component_context);

		if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
			// TODO we only need optional chaining here because `{#await ...}` blocks
			// are anomalous. Once we retire them we can get rid of it
			previous_batch?.activate();
			previous_batch?.apply();
		}
	};
}

function unset_context(deactivate_batch = true) {
	set_active_effect(null);
	set_active_reaction(null);
	set_component_context(null);
	if (deactivate_batch) current_batch?.deactivate();
}

/**
 * @returns {(skip?: boolean) => void}
 */
function increment_pending() {
	var effect = /** @type {Effect} */ (active_effect);
	var boundary = effect.b; // undefined if called outside the render tree, e.g. a standalone $effect.root
	var batch = /** @type {Batch} */ (current_batch);
	var blocking = !!boundary?.is_rendered();

	boundary?.update_pending_count(1, batch);
	batch.increment(blocking, effect);

	return () => {
		boundary?.update_pending_count(-1, batch);
		batch.decrement(blocking, effect);
	};
}

/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */
/** @import { Batch } from './batch.js'; */
/** @import { Boundary } from '../dom/blocks/boundary.js'; */

/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/*#__NO_SIDE_EFFECTS__*/
function derived(fn) {
	var flags = DERIVED | DIRTY;

	if (active_effect !== null) {
		// Since deriveds are evaluated lazily, any effects created inside them are
		// created too late to ensure that the parent effect is added to the tree
		active_effect.f |= EFFECT_PRESERVED;
	}

	/** @type {Derived<V>} */
	const signal = {
		ctx: component_context,
		deps: null,
		effects: null,
		equals,
		f: flags,
		fn,
		reactions: null,
		rv: 0,
		v: /** @type {V} */ (UNINITIALIZED),
		wv: 0,
		parent: active_effect,
		ac: null
	};

	return signal;
}

const OBSOLETE = Symbol('obsolete');

/**
 * @template V
 * @param {() => V | Promise<V>} fn
 * @param {string} [label]
 * @param {string} [location] If provided, print a warning if the value is not read immediately after update
 * @returns {Promise<Source<V>>}
 */
/*#__NO_SIDE_EFFECTS__*/
function async_derived(fn, label, location) {
	let parent = /** @type {Effect | null} */ (active_effect);

	if (parent === null) {
		async_derived_orphan();
	}

	var promise = /** @type {Promise<V>} */ (/** @type {unknown} */ (undefined));
	var signal = source(/** @type {V} */ (UNINITIALIZED));

	// only suspend in async deriveds created on initialisation
	var should_suspend = !active_reaction;

	/** @type {Set<ReturnType<typeof deferred<V>>>} */
	var deferreds = new Set();

	async_effect(() => {
		var effect = /** @type {Effect} */ (active_effect);

		/** @type {ReturnType<typeof deferred<V>>} */
		var d = deferred();
		promise = d.promise;

		try {
			// If this code is changed at some point, make sure to still access the then property
			// of fn() to read any signals it might access, so that we track them as dependencies.
			// We call `unset_context` to undo any `save` calls that happen inside `fn()`
			Promise.resolve(fn())
				.then(d.resolve, (e) => {
					// if the promise was rejected by the user, via `getAbortSignal`, then
					// wait for a subsequent resolution instead of flushing the batch
					if (e !== STALE_REACTION) d.reject(e);
				})
				.finally(unset_context);
		} catch (error) {
			d.reject(error);
			unset_context();
		}

		var batch = /** @type {Batch} */ (current_batch);

		if (should_suspend) {
			// we only increment the batch's pending state for updates, not creation, otherwise
			// we will decrement to zero before the work that depends on this promise (e.g. a
			// template effect) has initialized, causing the batch to resolve prematurely
			if ((effect.f & REACTION_RAN) !== 0) {
				var decrement_pending = increment_pending();
			}

			if (
				// boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
				parent.b?.is_rendered()
			) {
				batch.async_deriveds.get(effect)?.reject(OBSOLETE);
			} else {
				// While the boundary is still showing pending, a new run supersedes all older in-flight runs
				// for this async expression. Cancel eagerly so resolution cannot commit stale values.
				for (const d of deferreds.values()) {
					d.reject(OBSOLETE);
				}
			}

			deferreds.add(d);
			batch.async_deriveds.set(effect, d);
		}

		/**
		 * @param {any} value
		 * @param {unknown} error
		 */
		const handler = (value, error = undefined) => {

			decrement_pending?.();
			deferreds.delete(d);

			if (error === OBSOLETE) return;

			batch.activate();

			if (error) {
				signal.f |= ERROR_VALUE;

				// @ts-expect-error the error is the wrong type, but we don't care
				internal_set(signal, error);
			} else {
				if ((signal.f & ERROR_VALUE) !== 0) {
					signal.f ^= ERROR_VALUE;
				}

				internal_set(signal, value);
			}

			batch.deactivate();
		};

		d.promise.then(handler, (e) => handler(null, e || 'unknown'));
	});

	teardown(() => {
		for (const d of deferreds) {
			d.reject(OBSOLETE);
		}
	});

	return new Promise((fulfil) => {
		/** @param {Promise<V>} p */
		function next(p) {
			function go() {
				if (p === promise) {
					fulfil(signal);
				} else {
					// if the effect re-runs before the initial promise
					// resolves, delay resolution until we have a value
					next(promise);
				}
			}

			p.then(go, go);
		}

		next(promise);
	});
}

/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/*#__NO_SIDE_EFFECTS__*/
function user_derived(fn) {
	const d = derived(fn);

	push_reaction_value(d);

	return d;
}

/**
 * @template V
 * @param {() => V} fn
 * @returns {Derived<V>}
 */
/*#__NO_SIDE_EFFECTS__*/
function derived_safe_equal(fn) {
	const signal = derived(fn);
	signal.equals = safe_equals;
	return signal;
}

/**
 * @param {Derived} derived
 * @returns {void}
 */
function destroy_derived_effects(derived) {
	var effects = derived.effects;

	if (effects !== null) {
		derived.effects = null;

		for (var i = 0; i < effects.length; i += 1) {
			destroy_effect(/** @type {Effect} */ (effects[i]));
		}
	}
}

/**
 * @template T
 * @param {Derived} derived
 * @returns {T}
 */
function execute_derived(derived) {
	var value;
	var prev_active_effect = active_effect;
	var parent = derived.parent;

	if (
		!is_destroying_effect &&
		parent !== null &&
		derived.v !== UNINITIALIZED && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
		(parent.f & (DESTROYED | INERT)) !== 0
	) {
		derived_inert();

		return derived.v;
	}

	set_active_effect(parent);

	{
		try {
			destroy_derived_effects(derived);
			value = update_reaction(derived);
		} finally {
			set_active_effect(prev_active_effect);
		}
	}

	return value;
}

/**
 * @param {Derived} derived
 * @returns {void}
 */
function update_derived(derived) {
	var value = execute_derived(derived);

	if (!derived.equals(value)) {
		derived.wv = increment_write_version();

		// in a fork, we don't update the underlying value, just `batch_values`.
		// the underlying value will be updated when the fork is committed.
		// otherwise, the next time we get here after a 'real world' state
		// change, `derived.equals` may incorrectly return `true`
		if (!current_batch?.is_fork || derived.deps === null) {
			if (current_batch !== null) {
				// We also write to previous_batch because if it exists, it is a sign that we're
				// currently in the process of flushing effects. These updates to deriveds may belong
				// to the previous batch, not the new one (which can already exist if an earlier
				// effect wrote to a source). This can cause bugs when running batch.#commit() later,
				// but not adding it to current_batch can, too, so we add it to both.
				// See https://github.com/sveltejs/svelte/pull/18117 for more details.
				current_batch.capture(derived, value, true);
				previous_batch?.capture(derived, value, true);
			} else {
				derived.v = value;
			}

			// deriveds without dependencies should never be recomputed
			if (derived.deps === null) {
				set_signal_status(derived, CLEAN);
				return;
			}
		}
	}

	// don't mark derived clean if we're reading it inside a
	// cleanup function, or it will cache a stale value
	if (is_destroying_effect) {
		return;
	}

	// During time traveling we don't want to reset the status so that
	// traversal of the graph in the other batches still happens
	if (batch_values !== null) {
		// only cache the value if we're in a tracking context, otherwise we won't
		// clear the cache in `mark_reactions` when dependencies are updated
		if (effect_tracking() || current_batch?.is_fork) {
			batch_values.set(derived, value);
		}
	} else {
		update_derived_status(derived);
	}
}

/**
 * @param {Derived} derived
 */
function freeze_derived_effects(derived) {
	if (derived.effects === null) return;

	for (const e of derived.effects) {
		// if the effect has a teardown function or abort signal, call it
		if (e.teardown || e.ac) {
			e.teardown?.();
			if (e.ac !== null) {
				without_reactive_context(() => {
					/** @type {AbortController} */ (e.ac).abort(STALE_REACTION);
					e.ac = null;
				});
			}

			// make it a noop so it doesn't get called again if the derived
			// is unfrozen. we don't set it to `null`, because the existence
			// of a teardown function is what determines whether the
			// effect runs again during unfreezing (but not for teardown-only effects)
			if (e.fn !== null) e.teardown = noop;

			remove_reactions(e, 0);
			destroy_effect_children(e);
		}
	}
}

/**
 * @param {Derived} derived
 */
function unfreeze_derived_effects(derived) {
	if (derived.effects === null) return;

	for (const e of derived.effects) {
		// if the effect was previously frozen — indicated by the presence
		// of a teardown function — unfreeze it
		if (e.teardown && e.fn !== null) {
			update_effect(e);
		}
	}
}

/** @import { Fork } from 'svelte' */
/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */

/** @type {Batch | null} */
let first_batch = null;

/** @type {Batch | null} */
let last_batch = null;

/** @type {Batch | null} */
let current_batch = null;

/**
 * This is needed to avoid overwriting inputs
 * @type {Batch | null}
 */
let previous_batch = null;

/**
 * When time travelling (i.e. working in one batch, while other batches
 * still have ongoing work), we ignore the real values of affected
 * signals in favour of their values within the batch
 * @type {Map<Value, any> | null}
 */
let batch_values = null;

/** @type {Effect | null} */
let last_scheduled_effect = null;

let is_flushing_sync = false;
let is_processing = false;

/**
 * During traversal, this is an array. Newly created effects are (if not immediately
 * executed) pushed to this array, rather than going through the scheduling
 * rigamarole that would cause another turn of the flush loop.
 * @type {Effect[] | null}
 */
let collected_effects = null;

/**
 * An array of effects that are marked during traversal as a result of a `set`
 * (not `internal_set`) call. These will be added to the next batch and
 * trigger another `batch.process()`
 * @type {Effect[] | null}
 * @deprecated when we get rid of legacy mode and stores, we can get rid of this
 */
let legacy_updates = null;

var flush_count = 0;

/** @type {Set<Value>} */
var source_stacks = new Set();

let uid = 1;

class Batch {
	id = uid++;

	/** True as soon as `#process` was called */
	#started = false;

	linked = true;

	/** @type {Batch | null} */
	#prev = null;

	/** @type {Batch | null} */
	#next = null;

	/** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
	async_deriveds = new Map();

	/**
	 * The current values of any signals that are updated in this batch.
	 * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
	 * They keys of this map are identical to `this.#previous`
	 * @type {Map<Value, [any, boolean]>}
	 */
	current = new Map();

	/**
	 * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
	 * They keys of this map are identical to `this.#current`
	 * @type {Map<Value, any>}
	 */
	previous = new Map();

	/**
	 * When the batch is committed (and the DOM is updated), we need to remove old branches
	 * and append new ones by calling the functions added inside (if/each/key/etc) blocks
	 * @type {Set<(batch: Batch) => void>}
	 */
	#commit_callbacks = new Set();

	/**
	 * If a fork is discarded, we need to destroy any effects that are no longer needed
	 * @type {Set<(batch: Batch) => void>}
	 */
	#discard_callbacks = new Set();

	/**
	 * The number of async effects that are currently in flight
	 */
	#pending = 0;

	/**
	 * Async effects that are currently in flight, _not_ inside a pending boundary
	 * @type {Map<Effect, number>}
	 */
	#blocking_pending = new Map();

	/**
	 * A deferred that resolves when the batch is committed, used with `settled()`
	 * TODO replace with Promise.withResolvers once supported widely enough
	 * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
	 */
	#deferred = null;

	/**
	 * Effects that were scheduled in this batch but not yet 'resolved' into the
	 * root effects that need to be flushed. Resolving — the upwards traversal that
	 * marks the path to each effect on the shared effect tree (see #resolve) — is
	 * deferred until the batch is processed, so that the markers are created and
	 * consumed within a single traversal. Scheduling into other batches (which can
	 * happen concurrently, e.g. while a batch is committed) can therefore never
	 * observe (and be confused by) this batch's markers.
	 * May contain duplicates — deduplication happens during resolving
	 * @type {Effect[]}
	 */
	#scheduled = [];

	/**
	 * Effects created while this batch was active.
	 * @type {Effect[]}
	 */
	#new_effects = [];

	/**
	 * Deferred effects (which run after async work has completed) that are DIRTY
	 * @type {Set<Effect>}
	 */
	#dirty_effects = new Set();

	/**
	 * Deferred effects that are MAYBE_DIRTY
	 * @type {Set<Effect>}
	 */
	#maybe_dirty_effects = new Set();

	/**
	 * A map of branches that still exist, but will be destroyed when this batch
	 * is committed — we skip over these during `process`.
	 * The value contains child effects that were dirty/maybe_dirty before being reset,
	 * so they can be rescheduled if the branch survives.
	 * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
	 */
	#skipped_branches = new Map();

	/**
	 * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
	 * @type {Set<Effect>}
	 */
	#unskipped_branches = new Set();

	is_fork = false;

	#decrement_queued = false;

	constructor() {
		// link batch
		if (last_batch === null) {
			first_batch = last_batch = this;
		} else {
			last_batch.#next = this;
			this.#prev = last_batch;
		}

		last_batch = this;
	}

	#is_deferred() {
		if (this.is_fork) return true;

		for (const effect of this.#blocking_pending.keys()) {
			var e = effect;
			var skipped = false;

			while (e.parent !== null) {
				if (this.#skipped_branches.has(e)) {
					skipped = true;
					break;
				}

				e = e.parent;
			}

			if (!skipped) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Add an effect to the #skipped_branches map and reset its children
	 * @param {Effect} effect
	 */
	skip_effect(effect) {
		if (!this.#skipped_branches.has(effect)) {
			this.#skipped_branches.set(effect, { d: [], m: [] });
		}
		this.#unskipped_branches.delete(effect);
	}

	/**
	 * Remove an effect from the #skipped_branches map and reschedule
	 * any tracked dirty/maybe_dirty child effects
	 * @param {Effect} effect
	 * @param {(e: Effect) => void} callback
	 */
	unskip_effect(effect, callback = (e) => this.schedule(e)) {
		var tracked = this.#skipped_branches.get(effect);
		if (tracked) {
			this.#skipped_branches.delete(effect);

			for (var e of tracked.d) {
				set_signal_status(e, DIRTY);
				callback(e);
			}

			for (e of tracked.m) {
				set_signal_status(e, MAYBE_DIRTY);
				callback(e);
			}
		}
		this.#unskipped_branches.add(effect);
	}

	/**
	 * Convert the effects that were scheduled in this batch into the root effects
	 * that need to be traversed, marking the path to each effect (by clearing the
	 * `CLEAN` flag on ancestor branches) so that the traversal can find them.
	 * This happens right before traversal rather than at scheduling time, so that
	 * the markers left on the (shared) effect tree are created and consumed within
	 * a single traversal — scheduling into other batches can never observe them
	 * @returns {Effect[]}
	 */
	#resolve() {
		/** @type {Effect[]} */
		var roots = [];

		for (const effect of this.#scheduled) {
			// skip effects that are destroyed, or that already ran (e.g. because
			// they were reached by the traversal that preceded a drain iteration,
			// or because they were scheduled twice)
			if ((effect.f & DESTROYED) !== 0 || (effect.f & (DIRTY | MAYBE_DIRTY)) === 0) continue;

			var e = effect;
			var covered = false;

			while (e.parent !== null) {
				e = e.parent;
				var flags = e.f;

				if ((flags & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
					if ((flags & CLEAN) === 0) {
						// the path to the root was already marked, meaning the
						// root was already collected — nothing left to do
						covered = true;
						break;
					}

					e.f ^= CLEAN;
				}
			}

			if (!covered) {
				roots.push(e);
			}
		}

		this.#scheduled = [];

		return roots;
	}

	#process() {
		this.#started = true;

		// We always reschedule previously-deferred effects, not just when
		// #is_deferred() is true, because traversing the tree could make
		// an if block that contains the last blocking pending effect falsy,
		// causing the block to no longer be deferred.
		for (const e of this.#dirty_effects) {
			this.#maybe_dirty_effects.delete(e);
			set_signal_status(e, DIRTY);
			this.schedule(e);
		}

		for (const e of this.#maybe_dirty_effects) {
			set_signal_status(e, MAYBE_DIRTY);
			this.schedule(e);
		}

		this.apply();

		/** @type {Effect[]} */
		var effects = (collected_effects = []);

		/** @type {Effect[]} */
		var render_effects = [];

		/**
		 * @type {Effect[]}
		 * @deprecated when we get rid of legacy mode and stores, we can get rid of this
		 */
		var updates = (legacy_updates = []);

		// Effects can be scheduled during traversal (e.g. because a parent each/await/etc
		// block updated an internal source, or because an effect invalidated itself)
		// hence we loop until there are no more scheduled effects.
		while (this.#scheduled.length > 0) {
			if (flush_count++ > 1000) {
				this.#unlink();
				infinite_loop_guard(); // TODO try to reset_all() here?
			}

			for (const root of this.#resolve()) {
				try {
					this.#traverse(root, effects, render_effects);
				} catch (e) {
					reset_all(root);
					// If there's no async work left, this branch is now dead and needs
					// to be discarded to not become a zombie that is never cleaned up.
					// See https://github.com/sveltejs/svelte/issues/18221#issuecomment-4497918414
					// for a (non-minimal) reproduction that demonstrates a case where this is necessary
					// to not get follow-up false-positives via "batch has scheduled roots" invariant errors.
					if (!this.#is_deferred()) this.discard();
					throw e;
				}
			}
		}

		// any writes should take effect in a subsequent batch
		current_batch = null;

		if (updates.length > 0) {
			var batch = Batch.ensure();
			for (const e of updates) {
				batch.schedule(e);
			}
		}

		collected_effects = null;
		legacy_updates = null;

		// if the batch has outstanding pending work, stash effects and bail
		if (this.#is_deferred()) {
			this.#defer_effects(render_effects);
			this.#defer_effects(effects);

			for (const [e, t] of this.#skipped_branches) {
				reset_branch(e, t);
			}

			if (updates.length > 0) {
				/** @type {Batch} */ (/** @type {unknown} */ (current_batch)).#process();
			}

			return;
		}

		const earlier_batch = this.#find_earlier_batch();

		if (earlier_batch) {
			// If this batch collected deferred effects during traversal, they still need
			// to run after being merged into the earlier batch.
			this.#defer_effects(render_effects);
			this.#defer_effects(effects);
			earlier_batch.#merge(this);
			return;
		}

		// clear effects. Those that are still needed will be rescheduled through unskipping the skipped branches.
		this.#dirty_effects.clear();
		this.#maybe_dirty_effects.clear();

		// append/remove branches
		for (const fn of this.#commit_callbacks) fn(this);
		this.#commit_callbacks.clear();

		previous_batch = this;
		flush_queued_effects(render_effects);
		flush_queued_effects(effects);
		previous_batch = null;

		this.#deferred?.resolve();

		var next_batch = /** @type {Batch | null} */ (/** @type {unknown} */ (current_batch));

		if (this.#pending === 0 && (this.#scheduled.length === 0 || next_batch !== null)) {
			this.#unlink();
		}

		// Edge case: During traversal new branches might create effects that run immediately and set state,
		// causing an effect to be scheduled again. We need to traverse the current batch
		// once more in that case - most of the time this will just clean up dirty branches.
		if (this.#scheduled.length > 0) {
			if (next_batch !== null) {
				for (const e of this.#scheduled) {
					next_batch.#scheduled.push(e);
				}

				this.#scheduled = [];
			} else {
				next_batch = this;
			}
		}

		if (next_batch !== null) {
			old_values.clear();
			next_batch.#process();
		}
	}

	/**
	 * Traverse the effect tree, executing effects or stashing
	 * them for later execution as appropriate
	 * @param {Effect} root
	 * @param {Effect[]} effects
	 * @param {Effect[]} render_effects
	 */
	#traverse(root, effects, render_effects) {
		root.f ^= CLEAN;

		var effect = root.first;

		while (effect !== null) {
			var flags = effect.f;
			var is_branch = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
			var is_skippable_branch = is_branch && (flags & CLEAN) !== 0;

			var skip = is_skippable_branch || (flags & INERT) !== 0 || this.#skipped_branches.has(effect);

			if (!skip && effect.fn !== null) {
				if (is_branch) {
					effect.f ^= CLEAN;
				} else if ((flags & EFFECT) !== 0) {
					effects.push(effect);
				} else if (is_dirty(effect)) {
					if ((flags & BLOCK_EFFECT) !== 0) this.#maybe_dirty_effects.add(effect);
					update_effect(effect);
				}

				var child = effect.first;

				if (child !== null) {
					effect = child;
					continue;
				}
			}

			while (effect !== null) {
				var next = effect.next;

				if (next !== null) {
					effect = next;
					break;
				}

				effect = effect.parent;
			}
		}
	}

	#find_earlier_batch() {
		var batch = this.#prev;

		while (batch !== null) {
			if (!batch.is_fork) {
				// if the batches are connected, break
				for (const [value, [, is_derived]] of this.current) {
					if (batch.current.has(value) && !is_derived) {
						return batch;
					}
				}
			}

			batch = batch.#prev;
		}

		return null;
	}

	/**
	 * @param {Batch} batch
	 */
	#merge(batch) {
		for (const [source, value] of batch.current) {
			if (!this.previous.has(source) && batch.previous.has(source)) {
				this.previous.set(source, batch.previous.get(source));
			}

			this.current.set(source, value);
		}

		for (const [effect, deferred] of batch.async_deriveds) {
			const d = this.async_deriveds.get(effect);
			if (d) deferred.promise.then(d.resolve).catch(d.reject);
		}

		// Clear them or else those that are still pending might get rejected on discard (after merged-into batch is done).
		// This can happen when batch Y merged into X and Y has a pending boundary and therefore still-pending async deriveds inside.
		batch.async_deriveds.clear();

		// Mark is not guaranteed not touch these, so we transfer them
		this.transfer_effects(batch.#dirty_effects, batch.#maybe_dirty_effects);

		/**
		 * mark all effects that depend on `batch.current`, except the
		 * async effects that we just resolved (TODO unless they depend
		 * on values in this batch that are NOT in the later batch?).
		 * Through this we also will populate the correct #skipped_branches,
		 * oncommit callbacks etc, so we don't need to merge them separately.
		 * @param {Value} value
		 */
		const mark = (value) => {
			var reactions = value.reactions;
			if (reactions === null) return;
			// skip if value is derived and is neither dirty nor maybe dirty. transitive
			// deriveds (a derived depending on another derived) are only MAYBE_DIRTY, so
			// we must continue traversing them to reach the effects that depend on them
			if ((value.f & DERIVED) !== 0 && (value.f & (DIRTY | MAYBE_DIRTY)) === 0) {
				return;
			}

			for (const reaction of reactions) {
				var flags = reaction.f;

				if ((flags & DERIVED) !== 0) {
					mark(/** @type {Derived} */ (reaction));
				} else {
					var effect = /** @type {Effect} */ (reaction);

					if (flags & (ASYNC | BLOCK_EFFECT) && !this.async_deriveds.has(effect)) {
						this.#maybe_dirty_effects.delete(effect);
						set_signal_status(effect, DIRTY);
						this.schedule(effect);
					}
				}
			}
		};

		for (const source of this.current.keys()) {
			mark(source);
		}

		this.oncommit(() => batch.discard());
		batch.#unlink();

		current_batch = this;
		this.#process();
	}

	/**
	 * @param {Effect[]} effects
	 */
	#defer_effects(effects) {
		for (var i = 0; i < effects.length; i += 1) {
			defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
		}
	}

	/**
	 * Associate a change to a given source with the current
	 * batch, noting its previous and current values
	 * @param {Value} source
	 * @param {any} value
	 * @param {boolean} [is_derived]
	 */
	capture(source, value, is_derived = false) {
		if (source.v !== UNINITIALIZED && !this.previous.has(source)) {
			this.previous.set(source, source.v);
		}

		// Don't save errors in `batch_values`, or they won't be thrown in `runtime.js#get`
		if ((source.f & ERROR_VALUE) === 0) {
			this.current.set(source, [value, is_derived]);
			batch_values?.set(source, value);
		}

		if (!this.is_fork) {
			source.v = value;
		}
	}

	activate() {
		current_batch = this;
	}

	deactivate() {
		current_batch = null;
		batch_values = null;
	}

	flush() {
		try {
			if (DEV) ;

			is_processing = true;
			current_batch = this;

			this.#process();
		} finally {
			flush_count = 0;
			last_scheduled_effect = null;
			collected_effects = null;
			legacy_updates = null;
			is_processing = false;

			current_batch = null;
			batch_values = null;

			old_values.clear();
		}
	}

	discard() {
		for (const fn of this.#discard_callbacks) fn(this);
		this.#discard_callbacks.clear();

		for (const deferred of this.async_deriveds.values()) {
			deferred.reject(OBSOLETE);
		}

		this.#unlink();
		this.#deferred?.resolve();
	}

	/**
	 * @param {Effect} effect
	 */
	register_created_effect(effect) {
		this.#new_effects.push(effect);
	}

	#commit() {
		// If there are other pending batches, they now need to be 'rebased' —
		// in other words, we re-run block/async effects with the newly
		// committed state, unless the batch in question has a more
		// recent value for a given source
		for (let batch = first_batch; batch !== null; batch = batch.#next) {
			var is_earlier = batch.id < this.id;

			/** @type {Source[]} */
			var sources = [];

			for (const [source, [value, is_derived]] of this.current) {
				if (batch.current.has(source)) {
					var batch_value = /** @type {[any, boolean]} */ (batch.current.get(source))[0]; // faster than destructuring

					if (is_earlier && value !== batch_value) {
						// bring the value up to date
						batch.current.set(source, [value, is_derived]);
					} else {
						// same value or later batch has more recent value,
						// no need to re-run these effects
						continue;
					}
				}

				sources.push(source);
			}

			if (is_earlier) {
				// TODO do we need to restart these in some cases, instead of
				// immediately resolving them? Likely not because of how this.apply() works.
				for (const [effect, deferred] of this.async_deriveds) {
					const d = batch.async_deriveds.get(effect);
					if (d) deferred.promise.then(d.resolve).catch(d.reject);
				}
			}

			var current = [...batch.current.keys()].filter(
				(source) => !(/** @type {[any, boolean]} */ (batch.current.get(source))[1])
			);

			// If not started yet or no sources to update (which is e.g. possible for the very first batch) then bail
			if (!batch.#started || current.length === 0) continue;

			// Re-run async/block effects that depend on distinct values changed in both batches (ignoring deriveds)
			var others = current.filter((source) => !this.current.has(source));

			if (others.length === 0) {
				if (is_earlier) {
					// this batch is now obsolete and can be discarded
					batch.discard();
				}
			} else if (sources.length > 0) {

				// A batch was unskipped in a later batch -> tell prior batches to unskip it, too
				if (is_earlier) {
					for (const unskipped of this.#unskipped_branches) {
						batch.unskip_effect(unskipped, (e) => {
							if ((e.f & (BLOCK_EFFECT | ASYNC)) !== 0) {
								batch.schedule(e);
							} else {
								batch.#defer_effects([e]);
							}
						});
					}
				}

				batch.activate();

				/** @type {Set<Value>} */
				var marked = new Set();

				/** @type {Map<Reaction, boolean>} */
				var checked = new Map();

				for (var source of sources) {
					mark_effects(source, others, marked, checked);
				}

				checked = new Map();
				var current_unequal = [...batch.current]
					.filter(([c, v1]) => {
						const v2 = this.current.get(c);
						if (!v2) return true;
						// Either their values are different or one is a derived but not the other
						return v2[0] !== v1[0] || v2[1] !== v1[1];
					})
					.map(([c]) => c);

				if (current_unequal.length > 0) {
					for (const effect of this.#new_effects) {
						if (
							(effect.f & (DESTROYED | INERT | EAGER_EFFECT)) === 0 &&
							depends_on(effect, current_unequal, checked)
						) {
							if ((effect.f & (ASYNC | BLOCK_EFFECT)) !== 0) {
								set_signal_status(effect, DIRTY);
								batch.schedule(effect);
							} else {
								batch.#dirty_effects.add(effect);
							}
						}
					}
				}

				// Only apply and traverse when we know we triggered async work with marking the effects
				// and know this won't run anyway right afterwards
				if (batch.#scheduled.length > 0 && !batch.#decrement_queued) {
					batch.apply();

					for (var root of batch.#resolve()) {
						batch.#traverse(root, [], []);
					}
				}

				batch.deactivate();
			}
		}
	}

	/**
	 * @param {boolean} blocking
	 * @param {Effect} effect
	 */
	increment(blocking, effect) {
		this.#pending += 1;

		if (blocking) {
			let blocking_pending_count = this.#blocking_pending.get(effect) ?? 0;
			this.#blocking_pending.set(effect, blocking_pending_count + 1);
		}
	}

	/**
	 * @param {boolean} blocking
	 * @param {Effect} effect
	 */
	decrement(blocking, effect) {
		this.#pending -= 1;

		if (blocking) {
			let blocking_pending_count = this.#blocking_pending.get(effect) ?? 0;

			if (blocking_pending_count === 1) {
				this.#blocking_pending.delete(effect);
			} else {
				this.#blocking_pending.set(effect, blocking_pending_count - 1);
			}
		}

		if (this.#decrement_queued) return;
		this.#decrement_queued = true;

		queue_micro_task(() => {
			this.#decrement_queued = false;

			if (this.linked) {
				this.flush();
			}
		});
	}

	/**
	 * @param {Set<Effect>} dirty_effects
	 * @param {Set<Effect>} maybe_dirty_effects
	 */
	transfer_effects(dirty_effects, maybe_dirty_effects) {
		for (const e of dirty_effects) {
			this.#dirty_effects.add(e);
		}

		for (const e of maybe_dirty_effects) {
			this.#maybe_dirty_effects.add(e);
		}

		dirty_effects.clear();
		maybe_dirty_effects.clear();
	}

	/** @param {(batch: Batch) => void} fn */
	oncommit(fn) {
		this.#commit_callbacks.add(fn);
	}

	/** @param {(batch: Batch) => void} fn */
	ondiscard(fn) {
		this.#discard_callbacks.add(fn);
	}

	settled() {
		return (this.#deferred ??= deferred()).promise;
	}

	static ensure() {
		if (current_batch === null) {
			const batch = (current_batch = new Batch());

			if (!is_processing && !is_flushing_sync) {
				queue_micro_task(() => {
					if (!batch.#started) {
						batch.flush();
					}
				});
			}
		}

		return current_batch;
	}

	apply() {
		{
			batch_values = null;
			return;
		}
	}

	/**
	 *
	 * @param {Effect} effect
	 */
	schedule(effect) {
		last_scheduled_effect = effect;

		// defer render effects inside a pending boundary
		// TODO the `REACTION_RAN` check is only necessary because of legacy `$:` effects AFAICT — we can remove later
		if (
			effect.b?.is_pending &&
			(effect.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
			(effect.f & REACTION_RAN) === 0
		) {
			effect.b.defer_effect(effect);
			return;
		}

		this.#scheduled.push(effect);
	}

	#unlink() {
		// #merge calls #unlink, discard later on does it again - prevent
		// running it multiple times to not corrupt the linked list
		if (!this.linked) return;

		var prev = this.#prev;
		var next = this.#next;

		if (prev === null) {
			first_batch = next;
		} else {
			prev.#next = next;
		}

		if (next === null) {
			last_batch = prev;
		} else {
			next.#prev = prev;
		}

		this.linked = false;
	}
}

// TODO Svelte@6 think about removing the callback argument.
/**
 * Synchronously flush any pending updates.
 * Returns void if no callback is provided, otherwise returns the result of calling the callback.
 * @template [T=void]
 * @param {(() => T) | undefined} [fn]
 * @returns {T}
 */
function flushSync(fn) {
	var was_flushing_sync = is_flushing_sync;
	var prev_previous_batch = previous_batch;
	previous_batch = null;
	is_flushing_sync = true;

	try {
		var result;

		if (fn) ;

		while (true) {
			flush_tasks();

			if (current_batch === null) {
				return /** @type {T} */ (result);
			}

			current_batch.flush();
		}
	} finally {
		is_flushing_sync = was_flushing_sync;
		previous_batch = prev_previous_batch;
	}
}

function infinite_loop_guard() {

	try {
		effect_update_depth_exceeded();
	} catch (error) {

		// Best effort: invoke the boundary nearest the most recent
		// effect and hope that it's relevant to the infinite loop
		invoke_error_boundary(error, last_scheduled_effect);
	}
}

/** @type {Set<Effect> | null} */
let eager_block_effects = null;

/**
 * @param {Array<Effect>} effects
 * @returns {void}
 */
function flush_queued_effects(effects) {
	var length = effects.length;
	if (length === 0) return;

	var i = 0;

	while (i < length) {
		var effect = effects[i++];

		if ((effect.f & (DESTROYED | INERT)) === 0 && is_dirty(effect)) {
			eager_block_effects = new Set();

			update_effect(effect);

			// Effects with no dependencies or teardown do not get added to the effect tree.
			// Deferred effects (e.g. `$effect(...)`) _are_ added to the tree because we
			// don't know if we need to keep them until they are executed. Doing the check
			// here (rather than in `update_effect`) allows us to skip the work for
			// immediate effects.
			if (
				effect.deps === null &&
				effect.first === null &&
				effect.nodes === null &&
				effect.teardown === null &&
				effect.ac === null
			) {
				// remove this effect from the graph
				unlink_effect(effect);
			}

			// If update_effect() has a flushSync() in it, we may have flushed another flush_queued_effects(),
			// which already handled this logic and did set eager_block_effects to null.
			if (eager_block_effects?.size > 0) {
				old_values.clear();

				for (const e of eager_block_effects) {
					// Skip eager effects that have already been unmounted
					if ((e.f & (DESTROYED | INERT)) !== 0) continue;

					// Run effects in order from ancestor to descendant, else we could run into nullpointers
					/** @type {Effect[]} */
					const ordered_effects = [e];
					let ancestor = e.parent;
					while (ancestor !== null) {
						if (eager_block_effects.has(ancestor)) {
							eager_block_effects.delete(ancestor);
							ordered_effects.push(ancestor);
						}
						ancestor = ancestor.parent;
					}

					for (let j = ordered_effects.length - 1; j >= 0; j--) {
						const e = ordered_effects[j];
						// Skip eager effects that have already been unmounted
						if ((e.f & (DESTROYED | INERT)) !== 0) continue;
						update_effect(e);
					}
				}

				eager_block_effects.clear();
			}
		}
	}

	eager_block_effects = null;
}

/**
 * This is similar to `mark_reactions`, but it only marks async/block effects
 * depending on `value` and at least one of the other `sources`, so that
 * these effects can re-run after another batch has been committed
 * @param {Value} value
 * @param {Source[]} sources
 * @param {Set<Value>} marked
 * @param {Map<Reaction, boolean>} checked
 */
function mark_effects(value, sources, marked, checked) {
	if (marked.has(value)) return;
	marked.add(value);

	if (value.reactions !== null) {
		for (const reaction of value.reactions) {
			const flags = reaction.f;

			if ((flags & DERIVED) !== 0) {
				mark_effects(/** @type {Derived} */ (reaction), sources, marked, checked);
			} else if (
				(flags & (ASYNC | BLOCK_EFFECT)) !== 0 &&
				(flags & DIRTY) === 0 &&
				depends_on(reaction, sources, checked)
			) {
				set_signal_status(reaction, DIRTY);
				schedule_effect(/** @type {Effect} */ (reaction));
			}
		}
	}
}

/**
 * @param {Reaction} reaction
 * @param {Source[]} sources
 * @param {Map<Reaction, boolean>} checked
 */
function depends_on(reaction, sources, checked) {
	const depends = checked.get(reaction);
	if (depends !== undefined) return depends;

	if (reaction.deps !== null) {
		for (const dep of reaction.deps) {
			if (includes.call(sources, dep)) {
				return true;
			}

			if ((dep.f & DERIVED) !== 0 && depends_on(/** @type {Derived} */ (dep), sources, checked)) {
				checked.set(/** @type {Derived} */ (dep), true);
				return true;
			}
		}
	}

	checked.set(reaction, false);

	return false;
}

/**
 * @param {Effect} effect
 * @returns {void}
 */
function schedule_effect(effect) {
	/** @type {Batch} */ (current_batch).schedule(effect);
}

/**
 * Mark all the effects inside a skipped branch CLEAN, so that
 * they can be correctly rescheduled later. Tracks dirty and maybe_dirty
 * effects so they can be rescheduled if the branch survives.
 * @param {Effect} effect
 * @param {{ d: Effect[], m: Effect[] }} tracked
 */
function reset_branch(effect, tracked) {
	// clean branch = nothing dirty inside, no need to traverse further
	if ((effect.f & BRANCH_EFFECT) !== 0 && (effect.f & CLEAN) !== 0) {
		return;
	}

	if ((effect.f & DIRTY) !== 0) {
		tracked.d.push(effect);
	} else if ((effect.f & MAYBE_DIRTY) !== 0) {
		tracked.m.push(effect);
	}

	set_signal_status(effect, CLEAN);

	var e = effect.first;
	while (e !== null) {
		reset_branch(e, tracked);
		e = e.next;
	}
}

/**
 * Mark an entire effect tree clean following an error
 * @param {Effect} effect
 */
function reset_all(effect) {
	set_signal_status(effect, CLEAN);

	var e = effect.first;
	while (e !== null) {
		reset_all(e);
		e = e.next;
	}
}

/** @import { Derived, Effect, Source, Value } from '#client' */

/** @type {Set<Effect>} */
let eager_effects = new Set();

/** @type {Map<Value, any>} */
const old_values = new Map();

let eager_effects_deferred = false;

/**
 * @template V
 * @param {V} v
 * @param {Error | null} [stack]
 * @returns {Source<V>}
 */
// TODO rename this to `state` throughout the codebase
function source(v, stack) {
	/** @type {Value} */
	var signal = {
		f: 0, // TODO ideally we could skip this altogether, but it causes type errors
		v,
		reactions: null,
		equals,
		rv: 0,
		wv: 0
	};

	return signal;
}

/**
 * @template V
 * @param {V} v
 * @param {Error | null} [stack]
 */
/*#__NO_SIDE_EFFECTS__*/
function state(v, stack) {
	const s = source(v);

	push_reaction_value(s);

	return s;
}

/**
 * @template V
 * @param {V} initial_value
 * @param {boolean} [immutable]
 * @returns {Source<V>}
 */
/*#__NO_SIDE_EFFECTS__*/
function mutable_source(initial_value, immutable = false, trackable = true) {
	const s = source(initial_value);
	if (!immutable) {
		s.equals = safe_equals;
	}

	return s;
}

/**
 * @template V
 * @param {Value<V>} source
 * @param {V} value
 * @param {boolean} [should_proxy]
 * @returns {V}
 */
function set(source, value, should_proxy = false) {
	if (
		active_reaction !== null &&
		// since we are untracking the function inside `$inspect.with` we need to add this check
		// to ensure we error if state is set inside an inspect effect
		(!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
		is_runes() &&
		(active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 &&
		(current_sources === null || !current_sources.has(source))
	) {
		state_unsafe_mutation();
	}

	let new_value = should_proxy ? proxy(value) : value;

	return internal_set(source, new_value, legacy_updates);
}

/**
 * A set of signals we have already seen while traversing in mark_reactions.
 * Not always set to balance the common case of sources only having a couple
 * of (transitive) dependencies (where always creating a Set would be bad for perf)
 * with the edge case of extremely deep or wide dependency arrays with cycles.
 * @type {Set<any> | null}
 */
var seen = null;
/** Number of transitive dependencies, see {@link seen} for more info */
var count_deps = 0;

/**
 * @template V
 * @param {Value<V>} source
 * @param {V} value
 * @param {Effect[] | null} [updated_during_traversal]
 * @returns {V}
 */
function internal_set(source, value, updated_during_traversal = null) {
	if (!source.equals(value)) {
		if (is_destroying_effect) {
			old_values.set(source, value);
		} else if (!old_values.has(source)) {
			// only record the value from before the first write in this flush, otherwise a
			// teardown would see the value from before whichever write happened to be last
			old_values.set(source, source.v);
		}

		var batch = Batch.ensure();
		batch.capture(source, value);

		if ((source.f & DERIVED) !== 0) {
			const derived = /** @type {Derived} */ (source);

			// if we are assigning to a dirty derived we set it to clean/maybe dirty but we also eagerly execute it to track the dependencies
			if ((source.f & DIRTY) !== 0) {
				execute_derived(derived);
			}

			// During time traveling we don't want to reset the status so that
			// traversal of the graph in the other batches still happens
			if (batch_values === null) {
				update_derived_status(derived);
			}
		}

		source.wv = increment_write_version();

		// For debugging, in case you want to know which reactions are being scheduled:
		// log_reactions(source);
		seen = null;
		count_deps = 0;
		mark_reactions(source, DIRTY, updated_during_traversal);
		seen = null;

		// It's possible that the current reaction might not have up-to-date dependencies
		// whilst it's actively running. So in the case of ensuring it registers the reaction
		// properly for itself, we need to ensure the current effect actually gets
		// scheduled. i.e: `$effect(() => x++)`
		if (
			active_effect !== null &&
			(active_effect.f & CLEAN) !== 0 &&
			(active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
		) {
			if (untracked_writes === null) {
				set_untracked_writes([source]);
			} else {
				untracked_writes.push(source);
			}
		}

		if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
			flush_eager_effects();
		}
	}

	return value;
}

function flush_eager_effects() {
	eager_effects_deferred = false;

	for (const effect of eager_effects) {
		// Mark clean inspect-effects as maybe dirty and then check their dirtiness
		// instead of just updating the effects - this way we avoid overfiring.
		if ((effect.f & CLEAN) !== 0) {
			set_signal_status(effect, MAYBE_DIRTY);
		}

		let dirty;

		try {
			dirty = is_dirty(effect);
		} catch {
			// Dirty-checking can evaluate derived dependencies and throw in cases where
			// parent effects are about to destroy this eager effect. Run the effect so
			// its own error handling can deal with transient failures.
			dirty = true;
		}

		if (dirty) {
			update_effect(effect);
		}
	}

	eager_effects.clear();
}

/**
 * Silently (without using `get`) increment a source
 * @param {Source<number>} source
 */
function increment(source) {
	set(source, source.v + 1);
}

/**
 * @param {Value} signal
 * @param {number} status should be DIRTY or MAYBE_DIRTY
 * @param {Effect[] | null} updated_during_traversal
 * @returns {void}
 */
function mark_reactions(signal, status, updated_during_traversal) {
	var reactions = signal.reactions;
	if (reactions === null) return;
	var length = reactions.length;

	count_deps += length;
	// Activate the `seen` Set if we think from the unusually high number of deps that
	// there might be cycles in the graph, to avoid repeated lookups for reactions
	// Example: https://github.com/sveltejs/svelte/issues/16658 has a graph with one source
	// reaching ~10000 distinct deriveds/effects each, resulting in 65 million walks through repeated visits.
	if (count_deps > 100000 && seen === null) seen = new Set();

	if (seen !== null) {
		if (seen.has(signal)) return;
		seen.add(signal);
	}

	for (var i = 0; i < length; i++) {
		var reaction = reactions[i];
		var flags = reaction.f;

		var not_dirty = (flags & DIRTY) === 0;

		// don't set a DIRTY reaction to MAYBE_DIRTY
		if (not_dirty) {
			set_signal_status(reaction, status);
		}

		if ((flags & EAGER_EFFECT) !== 0) {
			// Eager effects need to run immediately:
			// - for $inspect so that the stack trace makes sense
			// - for $state.eager because they might be without an effect parent
			eager_effects.add(/** @type {Effect} */ (reaction));
		} else if ((flags & DERIVED) !== 0) {
			var derived = /** @type {Derived} */ (reaction);

			batch_values?.delete(derived);
			mark_reactions(derived, MAYBE_DIRTY, updated_during_traversal);
		} else if (not_dirty) {
			var effect = /** @type {Effect} */ (reaction);

			if ((flags & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
				eager_block_effects.add(effect);
			}

			if (updated_during_traversal !== null) {
				updated_during_traversal.push(effect);
			} else {
				schedule_effect(effect);
			}
		}
	}
}

/** @import { Source } from '#client' */

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function proxy(value) {
	// if non-proxyable, a component instance, or already a proxy, return `value`
	if (
		typeof value !== 'object' ||
		value === null ||
		STATE_SYMBOL in value ||
		COMPONENT_SYMBOL in value
	) {
		return value;
	}

	const prototype = get_prototype_of(value);

	if (prototype !== object_prototype && prototype !== array_prototype) {
		return value;
	}

	/** @type {Map<any, Source<any>>} */
	var sources = new Map();
	var is_proxied_array = is_array(value);
	var version = state(0);
	var parent_version = update_version;

	/**
	 * Executes the proxy in the context of the reaction it was originally created in, if any
	 * @template T
	 * @param {() => T} fn
	 */
	var with_parent = (fn) => {
		if (update_version === parent_version) {
			return fn();
		}

		// child source is being created after the initial proxy —
		// prevent it from being associated with the current reaction
		var reaction = active_reaction;
		var version = update_version;

		set_active_reaction(null);
		set_update_version(parent_version);

		var result = fn();

		set_active_reaction(reaction);
		set_update_version(version);

		return result;
	};

	if (is_proxied_array) {
		// We need to create the length source eagerly to ensure that
		// mutations to the array are properly synced with our proxy
		sources.set('length', state(/** @type {any[]} */ (value).length));
	}

	return new Proxy(/** @type {any} */ (value), {
		defineProperty(_, prop, descriptor) {
			if (
				!('value' in descriptor) ||
				descriptor.configurable === false ||
				descriptor.enumerable === false ||
				descriptor.writable === false
			) {
				// we disallow non-basic descriptors, because unless they are applied to the
				// target object — which we avoid, so that state can be forked — we will run
				// afoul of the various invariants
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/getOwnPropertyDescriptor#invariants
				state_descriptors_fixed();
			}
			var s = sources.get(prop);
			if (s === undefined) {
				with_parent(() => {
					var s = state(descriptor.value);
					sources.set(prop, s);
					return s;
				});
			} else {
				set(s, descriptor.value, true);
			}

			return true;
		},

		deleteProperty(target, prop) {
			var s = sources.get(prop);

			if (s === undefined) {
				if (prop in target) {
					const s = with_parent(() => state(UNINITIALIZED));
					sources.set(prop, s);
					increment(version);
				}
			} else {
				set(s, UNINITIALIZED);
				increment(version);
			}

			return true;
		},

		get(target, prop, receiver) {
			if (prop === STATE_SYMBOL) {
				return value;
			}

			var s = sources.get(prop);
			var exists = prop in target;

			// create a source, but only if it's an own property and not a prototype property
			if (s === undefined && (!exists || get_descriptor(target, prop)?.writable)) {
				s = with_parent(() => {
					var p = proxy(exists ? target[prop] : UNINITIALIZED);
					var s = state(p);

					return s;
				});

				sources.set(prop, s);
			}

			if (s !== undefined) {
				var v = get(s);
				return v === UNINITIALIZED ? undefined : v;
			}

			return Reflect.get(target, prop, receiver);
		},

		getOwnPropertyDescriptor(target, prop) {
			this.has?.(target, prop);

			var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
			var s = sources.get(prop);

			if (s !== undefined) {
				var value = get(s);

				if (value === UNINITIALIZED) {
					return undefined;
				}

				if (descriptor && 'value' in descriptor) {
					descriptor.value = value;
				} else {
					return {
						enumerable: true,
						configurable: true,
						value,
						writable: true
					};
				}
			}

			return descriptor;
		},

		has(target, prop) {
			if (prop === STATE_SYMBOL) {
				return true;
			}

			var s = sources.get(prop);
			var has = (s !== undefined && s.v !== UNINITIALIZED) || Reflect.has(target, prop);

			if (
				s !== undefined ||
				(active_effect !== null && (!has || get_descriptor(target, prop)?.writable))
			) {
				if (s === undefined) {
					s = with_parent(() => {
						var p = has ? proxy(target[prop]) : UNINITIALIZED;
						var s = state(p);

						return s;
					});

					sources.set(prop, s);
				}

				var value = get(s);
				if (value === UNINITIALIZED) {
					return false;
				}
			}

			return has;
		},

		set(target, prop, value, receiver) {
			var s = sources.get(prop);
			var has = prop in target;

			// variable.length = value -> clear all signals with index >= value
			if (is_proxied_array && prop === 'length') {
				for (var i = value; i < /** @type {Source<number>} */ (s).v; i += 1) {
					var other_s = sources.get(i + '');
					if (other_s !== undefined) {
						set(other_s, UNINITIALIZED);
					} else if (i in target) {
						// If the item exists in the original, we need to create an uninitialized source,
						// else a later read of the property would result in a source being created with
						// the value of the original item at that index.
						other_s = with_parent(() => state(UNINITIALIZED));
						sources.set(i + '', other_s);
					}
				}
			}

			// If we haven't yet created a source for this property, we need to ensure
			// we do so otherwise if we read it later, then the write won't be tracked and
			// the heuristics of effects will be different vs if we had read the proxied
			// object property before writing to that property.
			if (s === undefined) {
				if (!has || get_descriptor(target, prop)?.writable) {
					s = with_parent(() => state(undefined));
					set(s, proxy(value));

					sources.set(prop, s);
				}
			} else {
				has = s.v !== UNINITIALIZED;

				var p = with_parent(() => proxy(value));
				set(s, p);
			}

			var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

			// Set the new value before updating any signals so that any listeners get the new value
			if (descriptor?.set) {
				descriptor.set.call(receiver, value);
			}

			if (!has) {
				// If we have mutated an array directly, we might need to
				// signal that length has also changed. Do it before updating metadata
				// to ensure that iterating over the array as a result of a metadata update
				// will not cause the length to be out of sync.
				if (is_proxied_array && typeof prop === 'string') {
					var ls = /** @type {Source<number>} */ (sources.get('length'));
					var n = Number(prop);

					if (Number.isInteger(n) && n >= ls.v) {
						set(ls, n + 1);
					}
				}

				increment(version);
			}

			return true;
		},

		ownKeys(target) {
			get(version);

			var own_keys = Reflect.ownKeys(target).filter((key) => {
				var source = sources.get(key);
				return source === undefined || source.v !== UNINITIALIZED;
			});

			for (var [key, source] of sources) {
				if (source.v !== UNINITIALIZED && !(key in target)) {
					own_keys.push(key);
				}
			}

			return own_keys;
		},

		setPrototypeOf() {
			state_prototype_fixed();
		}
	});
}

/** @import { Effect, TemplateNode } from '#client' */

// export these for reference in the compiled code, making global name deduplication unnecessary
/** @type {Window} */
var $window;

/** @type {boolean} */
var is_firefox;

/** @type {() => Node | null} */
var first_child_getter;
/** @type {() => Node | null} */
var next_sibling_getter;

/**
 * Initialize these lazily to avoid issues when using the runtime in a server context
 * where these globals are not available while avoiding a separate server entry point
 */
function init_operations() {
	if ($window !== undefined) {
		return;
	}

	$window = window;
	is_firefox = /Firefox/.test(navigator.userAgent);

	var element_prototype = Element.prototype;
	var node_prototype = Node.prototype;
	var text_prototype = Text.prototype;

	// @ts-ignore
	first_child_getter = get_descriptor(node_prototype, 'firstChild').get;
	// @ts-ignore
	next_sibling_getter = get_descriptor(node_prototype, 'nextSibling').get;

	if (is_extensible(element_prototype)) {
		// the following assignments improve perf of lookups on DOM nodes
		/** @type {any} */ (element_prototype)[CLASS_CACHE] = undefined;
		/** @type {any} */ (element_prototype)[ATTRIBUTES_CACHE] = null;
		/** @type {any} */ (element_prototype)[STYLE_CACHE] = undefined;
		// @ts-expect-error
		element_prototype.__e = undefined;
	}

	if (is_extensible(text_prototype)) {
		/** @type {any} */ (text_prototype)[TEXT_CACHE] = undefined;
	}
}

/**
 * @param {string} value
 * @returns {Text}
 */
function create_text(value = '') {
	return document.createTextNode(value);
}

/**
 * @template {Node} N
 * @param {N} node
 */
/*@__NO_SIDE_EFFECTS__*/
function get_first_child(node) {
	return /** @type {TemplateNode | null} */ (first_child_getter.call(node));
}

/**
 * @template {Node} N
 * @param {N} node
 */
/*@__NO_SIDE_EFFECTS__*/
function get_next_sibling(node) {
	return /** @type {TemplateNode | null} */ (next_sibling_getter.call(node));
}

/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @template {Node} N
 * @param {N} node
 * @param {boolean} is_text
 * @returns {TemplateNode | null}
 */
function child(node, is_text) {
	{
		return get_first_child(node);
	}
}

/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {TemplateNode} node
 * @param {boolean} [is_text]
 * @returns {TemplateNode | null}
 */
function first_child(node, is_text = false) {
	{
		var first = get_first_child(node);

		// TODO prevent user comments with the empty string when preserveComments is true
		if (first instanceof Comment && first.data === '') return get_next_sibling(first);

		return first;
	}
}

/**
 * `child`, for the very common case of an element with exactly one child. Resetting the
 * hydration cursor is part of the same step, so the compiler doesn't have to emit a
 * separate `reset` call for every `<p>{text}</p>` in an app.
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {TemplateNode} node
 * @param {boolean} [is_text]
 * @returns {TemplateNode | null}
 */
function only_child(node, is_text = false) {
	{
		return get_first_child(node);
	}
}

/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {TemplateNode} node
 * @param {number} count
 * @param {boolean} is_text
 * @returns {TemplateNode | null}
 */
function sibling(node, count = 1, is_text = false) {
	let next_sibling = node;

	while (count--) {
		next_sibling = /** @type {TemplateNode} */ (get_next_sibling(next_sibling));
	}

	{
		return next_sibling;
	}
}

/**
 * @template {Node} N
 * @param {N} node
 * @returns {void}
 */
function clear_text_content(node) {
	node.textContent = '';
}

/**
 * Returns `true` if we're updating the current block, for example `condition` in
 * an `{#if condition}` block just changed. In this case, the branch should be
 * appended (or removed) at the same time as other updates within the
 * current `<svelte:boundary>`
 */
function should_defer_append() {
	return false;
}

/**
 * Branching here is intentional and load-bearing for perf. `createElement(tag)`
 * hits a fast path in Blink that `createElementNS(NAMESPACE_HTML, tag)` doesn't,
 * and passing an explicit `undefined` as the trailing options arg measurably
 * slows both APIs. Funnelling every case through a single `createElementNS(ns,
 * tag, options)` call would be smaller but slower on the HTML path.
 *
 * @template {keyof HTMLElementTagNameMap | string} T
 * @param {T} tag
 * @param {string} [namespace]
 * @param {string} [is]
 * @returns {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element}
 */
function create_element(tag, namespace, is) {
	{
		return /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */ (
			is ? document.createElement(tag, { is }) : document.createElement(tag)
		);
	}
}

/** @import { Derived, Effect } from '#client' */
/** @import { Boundary } from './dom/blocks/boundary.js' */

/**
 * @param {unknown} error
 */
function handle_error(error) {
	var effect = active_effect;

	// for unowned deriveds, don't throw until we read the value
	if (effect === null) {
		/** @type {Derived} */ (active_reaction).f |= ERROR_VALUE;
		return error;
	}

	// if the error occurred while creating this subtree, we let it
	// bubble up until it hits a boundary that can handle it, unless
	// it's an $effect in which case it doesn't run immediately
	if ((effect.f & REACTION_RAN) === 0 && (effect.f & EFFECT) === 0) {

		throw error;
	}

	// otherwise we bubble up the effect tree ourselves
	invoke_error_boundary(error, effect);
}

/**
 * @param {unknown} error
 * @param {Effect | null} effect
 */
function invoke_error_boundary(error, effect) {
	if (error === HYDRATION_ERROR) {
		throw error;
	}

	if (effect !== null && (effect.f & DESTROYED) !== 0) {
		return;
	}

	while (effect !== null) {
		// Skip boundaries that are destroyed/destroying and cannot meaningfully handle the error.
		if ((effect.f & BOUNDARY_EFFECT) !== 0 && (effect.f & (DESTROYED | DESTROYING)) === 0) {
			if ((effect.f & REACTION_RAN) === 0) {
				// we are still creating the boundary effect
				throw error;
			}

			try {
				/** @type {Boundary} */ (effect.b).error(error);
				return;
			} catch (e) {
				error = e;
			}
		}

		effect = effect.parent;
	}

	throw error;
}

/** @import { Blocker, ComponentContext, ComponentContextLegacy, Derived, Effect, TemplateNode, TransitionManager } from '#client' */

/**
 * @param {'$effect' | '$effect.pre' | '$inspect'} rune
 */
function validate_effect(rune) {
	if (active_effect === null) {
		if (active_reaction === null) {
			effect_orphan();
		}

		effect_in_unowned_derived();
	}

	if (is_destroying_effect) {
		effect_in_teardown();
	}
}

/**
 * @param {Effect} effect
 * @param {Effect} parent_effect
 */
function push_effect(effect, parent_effect) {
	var parent_last = parent_effect.last;
	if (parent_last === null) {
		parent_effect.last = parent_effect.first = effect;
	} else {
		parent_last.next = effect;
		effect.prev = parent_last;
		parent_effect.last = effect;
	}
}

/**
 * @param {number} type
 * @param {null | (() => void | (() => void))} fn
 * @returns {Effect}
 */
function create_effect(type, fn) {
	var parent = active_effect;

	if (parent !== null && (parent.f & INERT) !== 0) {
		type |= INERT;
	}

	/** @type {Effect} */
	var effect = {
		ctx: component_context,
		deps: null,
		nodes: null,
		f: type | DIRTY | CONNECTED,
		first: null,
		fn,
		last: null,
		next: null,
		parent,
		b: parent && parent.b,
		prev: null,
		teardown: null,
		wv: 0,
		ac: null
	};

	current_batch?.register_created_effect(effect);

	/** @type {Effect | null} */
	var e = effect;

	if ((type & EFFECT) !== 0) {
		if (collected_effects !== null) {
			// created during traversal — collect and run afterwards
			collected_effects.push(effect);
		} else {
			// schedule for later
			Batch.ensure().schedule(effect);
		}
	} else if (fn !== null) {
		try {
			update_effect(effect);
		} catch (e) {
			destroy_effect(effect);
			throw e;
		}

		// if an effect doesn't need to be kept in the tree (because it
		// won't re-run, has no DOM, and has no teardown etc)
		// then we skip it and go to its child (if any)
		if (
			e.deps === null &&
			e.teardown === null &&
			e.nodes === null &&
			e.first === e.last && // either `null`, or a singular child
			(e.f & EFFECT_PRESERVED) === 0
		) {
			e = e.first;
			if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e !== null) {
				e.f |= EFFECT_TRANSPARENT;
			}
		}
	}

	if (e !== null) {
		e.parent = parent;

		if (parent !== null) {
			push_effect(e, parent);
		}

		// if we're in a derived, add the effect there too
		if (
			active_reaction !== null &&
			(active_reaction.f & DERIVED) !== 0 &&
			(type & ROOT_EFFECT) === 0
		) {
			var derived = /** @type {Derived} */ (active_reaction);
			(derived.effects ??= []).push(e);
		}
	}

	return effect;
}

/**
 * Internal representation of `$effect.tracking()`
 * @returns {boolean}
 */
function effect_tracking() {
	return active_reaction !== null && !untracking;
}

/**
 * @param {() => void} fn
 */
function teardown(fn) {
	const effect = create_effect(RENDER_EFFECT, null);
	set_signal_status(effect, CLEAN);
	effect.teardown = fn;
	return effect;
}

/**
 * Internal representation of `$effect(...)`
 * @param {() => void | (() => void)} fn
 */
function user_effect(fn) {
	validate_effect();

	// Non-nested `$effect(...)` in a component should be deferred
	// until the component is mounted
	var flags = /** @type {Effect} */ (active_effect).f;
	var defer =
		!active_reaction &&
		(flags & BRANCH_EFFECT) !== 0 &&
		component_context !== null &&
		!component_context.i;

	if (defer) {
		// Top-level `$effect(...)` in an unmounted component — defer until mount
		var context = /** @type {ComponentContext} */ (component_context);
		(context.e ??= []).push(fn);
	} else {
		// Everything else — create immediately
		return create_user_effect(fn);
	}
}

/**
 * @param {() => void | (() => void)} fn
 */
function create_user_effect(fn) {
	return create_effect(EFFECT | USER_EFFECT, fn);
}

/**
 * An effect root whose children can transition out
 * @param {() => void} fn
 * @returns {(options?: { outro?: boolean }) => Promise<void>}
 */
function component_root(fn) {
	Batch.ensure();
	const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);

	return (options = {}) => {
		return new Promise((fulfil) => {
			if (options.outro) {
				pause_effect(effect, () => {
					destroy_effect(effect);
					fulfil(undefined);
				});
			} else {
				destroy_effect(effect);
				fulfil(undefined);
			}
		});
	};
}

/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function effect(fn) {
	return create_effect(EFFECT, fn);
}

/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function async_effect(fn) {
	return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}

/**
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function render_effect(fn, flags = 0) {
	return create_effect(RENDER_EFFECT | flags, fn);
}

/**
 * @param {(...expressions: any) => void | (() => void)} fn
 * @param {Array<() => any>} sync
 * @param {Array<() => Promise<any>>} async
 * @param {Blocker[]} blockers
 */
function template_effect(fn, sync = [], async = [], blockers = []) {
	flatten(blockers, sync, async, (values) => {
		create_effect(RENDER_EFFECT, () => {
			fn(...values.map(get));
		});
	});
}

/**
 * @param {(() => void)} fn
 * @param {number} flags
 */
function block(fn, flags = 0) {
	var effect = create_effect(BLOCK_EFFECT | flags, fn);
	return effect;
}

/**
 * @param {(() => void)} fn
 */
function branch(fn) {
	return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}

/**
 * @param {Effect} effect
 */
function execute_effect_teardown(effect) {
	var teardown = effect.teardown;
	if (teardown !== null) {
		const previously_destroying_effect = is_destroying_effect;
		const previous_reaction = active_reaction;
		set_is_destroying_effect(true);
		set_active_reaction(null);
		try {
			teardown.call(null);
		} catch (error) {
			// Route teardown errors through the boundary system so that a live
			// ancestor <svelte:boundary> can handle them. Boundaries that are
			// themselves mid-teardown are skipped by invoke_error_boundary.
			invoke_error_boundary(error, effect.parent);
		} finally {
			set_is_destroying_effect(previously_destroying_effect);
			set_active_reaction(previous_reaction);
		}
	}
}

/**
 * @param {Effect} signal
 * @param {boolean} remove_dom
 * @returns {void}
 */
function destroy_effect_children(signal, remove_dom = false) {
	var effect = signal.first;
	signal.first = signal.last = null;

	while (effect !== null) {
		const controller = effect.ac;

		if (controller !== null) {
			without_reactive_context(() => {
				controller.abort(STALE_REACTION);
			});
		}

		var next = effect.next;

		if ((effect.f & ROOT_EFFECT) !== 0) {
			// this is now an independent root
			effect.parent = null;
		} else {
			destroy_effect(effect, remove_dom);
		}

		effect = next;
	}
}

/**
 * @param {Effect} signal
 * @returns {void}
 */
function destroy_block_effect_children(signal) {
	var effect = signal.first;

	while (effect !== null) {
		var next = effect.next;
		if ((effect.f & BRANCH_EFFECT) === 0) {
			destroy_effect(effect);
		}
		effect = next;
	}
}

/**
 * @param {Effect} effect
 * @param {boolean} [remove_dom]
 * @returns {void}
 */
function destroy_effect(effect, remove_dom = true) {
	var removed = false;

	if (
		(remove_dom || (effect.f & HEAD_EFFECT) !== 0) &&
		effect.nodes !== null &&
		effect.nodes.end !== null
	) {
		remove_effect_dom(effect.nodes.start, /** @type {TemplateNode} */ (effect.nodes.end));
		removed = true;
	}

	effect.f |= DESTROYING;
	destroy_effect_children(effect, remove_dom && !removed);
	remove_reactions(effect, 0);

	var transitions = effect.nodes && effect.nodes.t;

	if (transitions !== null) {
		for (const transition of transitions) {
			transition.stop();
		}
	}

	execute_effect_teardown(effect);

	effect.f ^= DESTROYING;
	effect.f |= DESTROYED;

	var parent = effect.parent;

	// If the parent doesn't have any children, then skip this work altogether
	if (parent !== null && parent.first !== null) {
		unlink_effect(effect);
	}

	// `first` and `child` are nulled out in destroy_effect_children
	// we don't null out `parent` so that error propagation can work correctly
	effect.next =
		effect.prev =
		effect.teardown =
		effect.ctx =
		effect.deps =
		effect.fn =
		effect.nodes =
		effect.ac =
		effect.b =
			null;
}

/**
 *
 * @param {TemplateNode | null} node
 * @param {TemplateNode} end
 */
function remove_effect_dom(node, end) {
	while (node !== null) {
		/** @type {TemplateNode | null} */
		var next = node === end ? null : get_next_sibling(node);

		node.remove();
		node = next;
	}
}

/**
 * Detach an effect from the effect tree, freeing up memory and
 * reducing the amount of work that happens on subsequent traversals
 * @param {Effect} effect
 */
function unlink_effect(effect) {
	var parent = effect.parent;
	var prev = effect.prev;
	var next = effect.next;

	if (prev !== null) prev.next = next;
	if (next !== null) next.prev = prev;

	if (parent !== null) {
		if (parent.first === effect) parent.first = next;
		if (parent.last === effect) parent.last = prev;
	}
}

/**
 * When a block effect is removed, we don't immediately destroy it or yank it
 * out of the DOM, because it might have transitions. Instead, we 'pause' it.
 * It stays around (in memory, and in the DOM) until outro transitions have
 * completed, and if the state change is reversed then we _resume_ it.
 * A paused effect does not update, and the DOM subtree becomes inert.
 * @param {Effect} effect
 * @param {() => void} [callback]
 * @param {boolean} [destroy]
 */
function pause_effect(effect, callback, destroy = true) {
	/** @type {TransitionManager[]} */
	var transitions = [];

	effect.f |= PAUSED;
	pause_children(effect, transitions, true);

	var fn = () => {
		if (destroy) destroy_effect(effect);
		if (callback) callback();
	};

	var remaining = transitions.length;
	if (remaining > 0) {
		var check = () => --remaining || fn();
		for (var transition of transitions) {
			transition.out(check);
		}
	} else {
		fn();
	}
}

/**
 * @param {Effect} effect
 * @param {TransitionManager[]} transitions
 * @param {boolean} local
 */
function pause_children(effect, transitions, local) {
	if ((effect.f & INERT) !== 0) return;
	effect.f ^= INERT;

	var t = effect.nodes && effect.nodes.t;

	if (t !== null) {
		for (const transition of t) {
			if (transition.is_global || local) {
				transitions.push(transition);
			}
		}
	}

	var child = effect.first;

	while (child !== null) {
		var sibling = child.next;

		// If this child is a root effect, then it will become an independent root when its parent
		// is destroyed, it should therefore not become inert nor partake in transitions.
		if ((child.f & ROOT_EFFECT) === 0) {
			var transparent =
				(child.f & EFFECT_TRANSPARENT) !== 0 ||
				// If this is a branch effect without a block effect parent,
				// it means the parent block effect was pruned. In that case,
				// transparency information was transferred to the branch effect.
				((child.f & BRANCH_EFFECT) !== 0 && (effect.f & BLOCK_EFFECT) !== 0);
			// TODO we don't need to call pause_children recursively with a linked list in place
			// it's slightly more involved though as we have to account for `transparent` changing
			// through the tree.
			pause_children(child, transitions, transparent ? local : false);
		}

		child = sibling;
	}
}

/**
 * The opposite of `pause_effect`. We call this if (for example)
 * `x` becomes falsy then truthy: `{#if x}...{/if}`
 * @param {Effect} effect
 */
function resume_effect(effect) {
	effect.f &= ~PAUSED;
	resume_children(effect, true);
}

/**
 * @param {Effect} effect
 * @param {boolean} local
 */
function resume_children(effect, local) {
	// this subtree was paused for its own reasons (e.g. a block whose condition
	// is still false) — its controller will resume or destroy it
	if ((effect.f & PAUSED) !== 0) return;

	if ((effect.f & INERT) === 0) return;
	effect.f ^= INERT;

	// If a dependency of this effect changed while it was paused,
	// schedule the effect to update. we don't use `is_dirty`
	// here because we don't want to eagerly recompute a derived like
	// `{#if foo}{foo.bar()}{/if}` if `foo` is now `undefined
	if ((effect.f & CLEAN) === 0) {
		set_signal_status(effect, DIRTY);
		Batch.ensure().schedule(effect); // Assumption: This happens during the commit phase of the batch, causing another flush, but it's safe
	}

	var child = effect.first;

	while (child !== null) {
		var sibling = child.next;
		var transparent = (child.f & EFFECT_TRANSPARENT) !== 0 || (child.f & BRANCH_EFFECT) !== 0;
		// TODO we don't need to call resume_children recursively with a linked list in place
		// it's slightly more involved though as we have to account for `transparent` changing
		// through the tree.
		resume_children(child, transparent ? local : false);
		child = sibling;
	}

	var t = effect.nodes && effect.nodes.t;

	if (t !== null) {
		for (const transition of t) {
			if (transition.is_global || local) {
				transition.in();
			}
		}
	}
}

/**
 * @param {Effect} effect
 * @param {DocumentFragment} fragment
 */
function move_effect(effect, fragment) {
	if (!effect.nodes) return;

	/** @type {TemplateNode | null} */
	var node = effect.nodes.start;
	var end = effect.nodes.end;

	while (node !== null) {
		/** @type {TemplateNode | null} */
		var next = node === end ? null : get_next_sibling(node);

		fragment.append(node);
		node = next;
	}
}

/** @import { Derived, Effect, Reaction, Source, Value } from '#client' */

let is_destroying_effect = false;

/** @param {boolean} value */
function set_is_destroying_effect(value) {
	is_destroying_effect = value;
}

/** @type {null | Reaction} */
let active_reaction = null;

let untracking = false;

/** @param {null | Reaction} reaction */
function set_active_reaction(reaction) {
	active_reaction = reaction;
}

/** @type {null | Effect} */
let active_effect = null;

/** @param {null | Effect} effect */
function set_active_effect(effect) {
	active_effect = effect;
}

/**
 * When sources are created within a reaction, reading and writing
 * them within that reaction should not cause a re-run
 * @type {null | Set<Value>}
 */
let current_sources = null;

/** @param {Value} value */
function push_reaction_value(value) {
	if (
		active_reaction !== null &&
		(((active_reaction.f & REACTION_IS_UPDATING) !== 0) ||
			(active_reaction.f & DERIVED) !== 0)
	) {
		(current_sources ??= new Set()).add(value);
	}
}

/**
 * The dependencies of the reaction that is currently being executed. In many cases,
 * the dependencies are unchanged between runs, and so this will be `null` unless
 * and until a new dependency is accessed — we track this via `skipped_deps`
 * @type {null | Value[]}
 */
let new_deps = null;

let skipped_deps = 0;

/**
 * Tracks writes that the effect it's executed in doesn't listen to yet,
 * so that the dependency can be added to the effect later on if it then reads it
 * @type {null | Value[]}
 */
let untracked_writes = null;

/** @param {null | Value[]} value */
function set_untracked_writes(value) {
	untracked_writes = value;
}

/**
 * @type {number} Used by sources and deriveds for handling updates.
 * Version starts from 1 so that unowned deriveds differentiate between a created effect and a run one for tracing
 **/
let write_version = 1;

/** @type {number} Used to version each read of a source of derived to avoid duplicating dependencies inside a reaction */
let read_version = 0;

let update_version = read_version;

/** @param {number} value */
function set_update_version(value) {
	update_version = value;
}

function increment_write_version() {
	return ++write_version;
}

/**
 * Determines whether a derived or effect is dirty.
 * If it is MAYBE_DIRTY, will set the status to CLEAN
 * @param {Reaction} reaction
 * @returns {boolean}
 */
function is_dirty(reaction) {
	var flags = reaction.f;

	if ((flags & DIRTY) !== 0) {
		return true;
	}

	if ((flags & MAYBE_DIRTY) !== 0) {
		var dependencies = /** @type {Value[]} */ (reaction.deps);
		var length = dependencies.length;

		for (var i = 0; i < length; i++) {
			var dependency = dependencies[i];

			if (is_dirty(/** @type {Derived} */ (dependency))) {
				update_derived(/** @type {Derived} */ (dependency));
			}

			if (dependency.wv > reaction.wv) {
				return true;
			}
		}

		if (
			(flags & CONNECTED) !== 0 &&
			// During time traveling we don't want to reset the status so that
			// traversal of the graph in the other batches still happens
			batch_values === null
		) {
			set_signal_status(reaction, CLEAN);
		}
	}

	return false;
}

/**
 * @param {Value} signal
 * @param {Effect} effect
 * @param {boolean} [root]
 */
function schedule_possible_effect_self_invalidation(signal, effect, root = true) {
	var reactions = signal.reactions;
	if (reactions === null) return;

	if (current_sources !== null && current_sources.has(signal)) {
		return;
	}

	for (var i = 0; i < reactions.length; i++) {
		var reaction = reactions[i];

		if ((reaction.f & DERIVED) !== 0) {
			schedule_possible_effect_self_invalidation(/** @type {Derived} */ (reaction), effect, false);
		} else if (effect === reaction) {
			if (root) {
				set_signal_status(reaction, DIRTY);
			} else if ((reaction.f & CLEAN) !== 0) {
				set_signal_status(reaction, MAYBE_DIRTY);
			}
			schedule_effect(/** @type {Effect} */ (reaction));
		}
	}
}

/** @param {Reaction} reaction */
function update_reaction(reaction) {
	var previous_deps = new_deps;
	var previous_skipped_deps = skipped_deps;
	var previous_untracked_writes = untracked_writes;
	var previous_reaction = active_reaction;
	var previous_sources = current_sources;
	var previous_component_context = component_context;
	var previous_untracking = untracking;
	var previous_update_version = update_version;

	var flags = reaction.f;

	new_deps = /** @type {null | Value[]} */ (null);
	skipped_deps = 0;
	untracked_writes = null;
	active_reaction = (flags & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;

	current_sources = null;
	set_component_context(reaction.ctx);
	untracking = false;
	update_version = ++read_version;

	if (reaction.ac !== null) {
		without_reactive_context(() => {
			/** @type {AbortController} */ (reaction.ac).abort(STALE_REACTION);
		});

		reaction.ac = null;
	}

	try {
		reaction.f |= REACTION_IS_UPDATING;
		var fn = /** @type {Function} */ (reaction.fn);
		var result = fn();
		reaction.f |= REACTION_RAN;
		var deps = update_dependencies(reaction);

		// If we're inside an effect and we have untracked writes, then we need to
		// ensure that if any of those untracked writes result in re-invalidation
		// of the current effect, then that happens accordingly
		if (
			is_runes() &&
			untracked_writes !== null &&
			!untracking &&
			deps !== null &&
			(reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
		) {
			for (var i = 0; i < /** @type {Source[]} */ (untracked_writes).length; i++) {
				schedule_possible_effect_self_invalidation(
					untracked_writes[i],
					/** @type {Effect} */ (reaction)
				);
			}
		}

		// If we are returning to an previous reaction then
		// we need to increment the read version to ensure that
		// any dependencies in this reaction aren't marked with
		// the same version
		if (previous_reaction !== null && previous_reaction !== reaction) {
			read_version++;

			// update the `rv` of the previous reaction's deps — both existing and new —
			// so that they are not added again
			if (previous_reaction.deps !== null) {
				for (let i = 0; i < previous_skipped_deps; i += 1) {
					previous_reaction.deps[i].rv = read_version;
				}
			}

			if (previous_deps !== null) {
				for (const dep of previous_deps) {
					dep.rv = read_version;
				}
			}

			if (untracked_writes !== null) {
				if (previous_untracked_writes === null) {
					previous_untracked_writes = untracked_writes;
				} else {
					previous_untracked_writes.push(.../** @type {Source[]} */ (untracked_writes));
				}
			}
		}

		if ((reaction.f & ERROR_VALUE) !== 0) {
			reaction.f ^= ERROR_VALUE;
		}

		return result;
	} catch (error) {
		// still commit the deps read before the throw, otherwise deriveds connected by this run keep no reader and the reaction never re-runs when they change
		update_dependencies(reaction);

		return handle_error(error);
	} finally {
		reaction.f ^= REACTION_IS_UPDATING;
		new_deps = previous_deps;
		skipped_deps = previous_skipped_deps;
		untracked_writes = previous_untracked_writes;
		active_reaction = previous_reaction;
		current_sources = previous_sources;
		set_component_context(previous_component_context);
		untracking = previous_untracking;
		update_version = previous_update_version;
	}
}

/**
 * @param {Reaction} reaction
 */
function update_dependencies(reaction) {
	var deps = reaction.deps;

	// Don't remove reactions during fork;
	// they must remain for when fork is discarded
	var is_fork = current_batch?.is_fork;

	if (new_deps !== null) {
		var i;

		if (!is_fork) {
			remove_reactions(reaction, skipped_deps);
		}

		if (deps !== null && skipped_deps > 0) {
			deps.length = skipped_deps + new_deps.length;
			for (i = 0; i < new_deps.length; i++) {
				deps[skipped_deps + i] = new_deps[i];
			}
		} else {
			reaction.deps = deps = new_deps;
		}

		if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
			for (i = skipped_deps; i < deps.length; i++) {
				(deps[i].reactions ??= []).push(reaction);
			}
		}
	} else if (!is_fork && deps !== null && skipped_deps < deps.length) {
		remove_reactions(reaction, skipped_deps);
		deps.length = skipped_deps;
	}

	return deps;
}

/**
 * @template V
 * @param {Reaction} signal
 * @param {Value<V>} dependency
 * @returns {void}
 */
function remove_reaction(signal, dependency) {
	let reactions = dependency.reactions;
	if (reactions !== null) {
		var index = index_of.call(reactions, signal);
		if (index !== -1) {
			var new_length = reactions.length - 1;
			if (new_length === 0) {
				reactions = dependency.reactions = null;
			} else {
				// Swap with last element and then remove.
				reactions[index] = reactions[new_length];
				reactions.pop();
			}
		}
	}

	// If the derived has no reactions, then we can disconnect it from the graph,
	// allowing it to either reconnect in the future, or be GC'd by the VM.
	if (
		reactions === null &&
		(dependency.f & DERIVED) !== 0 &&
		// Destroying a child effect while updating a parent effect can cause a dependency to appear
		// to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
		// allows us to skip the expensive work of disconnecting and immediately reconnecting it
		(new_deps === null || !includes.call(new_deps, dependency))
	) {
		var derived = /** @type {Derived} */ (dependency);

		if ((derived.f & CONNECTED) !== 0) {
			derived.f ^= CONNECTED;
		}

		// In a fork it's possible that a derived is executed and gets reactions, then commits, but is
		// never re-executed. This is possible when the derived is only executed once in the context
		// of a new branch which happens before fork.commit() runs. In this case, the derived still has
		// UNINITIALIZED as its value, and then when it's losing its reactions we need to ensure it stays
		// DIRTY so it is reexecuted once someone wants its value again.
		if (derived.v !== UNINITIALIZED) {
			update_derived_status(derived);
		}

		// Call abort controller, noone's listening to this derived anymore
		if (derived.ac !== null) {
			without_reactive_context(() => {
				/** @type {AbortController} */ (derived.ac).abort(STALE_REACTION);
				derived.ac = null;
				// ensure it reruns right away next time instead of potentially returning a rejected promise as its value
				set_signal_status(derived, DIRTY);
			});
		}

		// freeze any effects inside this derived
		freeze_derived_effects(derived);

		// Disconnect any reactions owned by this reaction
		remove_reactions(derived, 0);
	}
}

/**
 * @param {Reaction} signal
 * @param {number} start_index
 * @returns {void}
 */
function remove_reactions(signal, start_index) {
	var dependencies = signal.deps;
	if (dependencies === null) return;

	for (var i = start_index; i < dependencies.length; i++) {
		remove_reaction(signal, dependencies[i]);
	}
}

/**
 * @param {Effect} effect
 * @returns {void}
 */
function update_effect(effect) {
	var flags = effect.f;

	if ((flags & DESTROYED) !== 0) {
		return;
	}

	set_signal_status(effect, CLEAN);

	var previous_effect = active_effect;

	active_effect = effect;

	try {
		if ((flags & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
			destroy_block_effect_children(effect);
		} else {
			destroy_effect_children(effect);
		}

		execute_effect_teardown(effect);
		var teardown = update_reaction(effect);
		effect.teardown = typeof teardown === 'function' ? teardown : null;
		effect.wv = write_version;

		// In DEV, increment versions of any sources that were written to during the effect,
		// so that they are correctly marked as dirty when the effect re-runs
		var dep; if (DEV && tracing_mode_flag && (effect.f & DIRTY) !== 0 && effect.deps !== null) ;
	} finally {
		active_effect = previous_effect;
	}
}

/**
 * Returns a promise that resolves once any pending state changes have been applied.
 * @returns {Promise<void>}
 */
async function tick() {

	await Promise.resolve();

	// By calling flushSync we guarantee that any pending state changes are applied after one tick.
	// TODO look into whether we can make flushing subsequent updates synchronously in the future.
	flushSync();
}

/**
 * @template V
 * @param {Value<V>} signal
 * @returns {V}
 */
function get(signal) {
	var flags = signal.f;
	var is_derived = (flags & DERIVED) !== 0;

	// Register the dependency on the current reaction signal.
	if (active_reaction !== null && !untracking) {
		// if we're in a derived that is being read inside an _async_ derived,
		// it's possible that the effect was already destroyed. In this case,
		// we don't add the dependency, because that would create a memory leak
		var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;

		if (!destroyed && (current_sources === null || !current_sources.has(signal))) {
			var deps = active_reaction.deps;

			if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
				// we're in the effect init/update cycle
				if (signal.rv < read_version) {
					signal.rv = read_version;

					// If the signal is accessing the same dependencies in the same
					// order as it did last time, increment `skipped_deps`
					// rather than updating `new_deps`, which creates GC cost
					if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
						skipped_deps++;
					} else if (new_deps === null) {
						new_deps = [signal];
					} else {
						new_deps.push(signal);
					}
				}
			} else {
				// We're adding a dependency outside the init/update cycle (i.e. after an `await`).
				// We have to deduplicate deps/reactions in this case or remove_reactions could
				// disconnect deps/reactions that are actually still in use (if skip_deps says
				// "disconnect all after this index" and some of the signals are also present in
				// list prior to the cutoff index, i.e. that should be kept).
				active_reaction.deps ??= [];
				if (!includes.call(active_reaction.deps, signal)) {
					active_reaction.deps.push(signal);
				}

				var reactions = signal.reactions;

				if (reactions === null) {
					signal.reactions = [active_reaction];
				} else if (!includes.call(reactions, active_reaction)) {
					reactions.push(active_reaction);
				}
			}
		}
	}

	if (is_destroying_effect && old_values.has(signal)) {
		return old_values.get(signal);
	}

	if (is_derived) {
		var derived = /** @type {Derived} */ (signal);

		if (is_destroying_effect) {
			var value = derived.v;

			// if the derived is dirty and has reactions, or depends on the values that just changed, re-execute
			// (a derived can be maybe_dirty due to the effect destroy removing its last reaction)
			if (
				((derived.f & CLEAN) === 0 && derived.reactions !== null) ||
				depends_on_old_values(derived)
			) {
				value = execute_derived(derived);
			}

			old_values.set(derived, value);

			return value;
		}

		// connect disconnected deriveds when reading them inside a connected reaction
		var should_connect =
			(derived.f & CONNECTED) === 0 &&
			!untracking &&
			active_reaction !== null &&
			(active_reaction.f & CONNECTED) !== 0;

		var is_new = (derived.f & REACTION_RAN) === 0;

		if (is_dirty(derived)) {
			if (should_connect) {
				// set the flag before `update_derived`, so that the derived
				// is added as a reaction to its dependencies
				derived.f |= CONNECTED;
			}

			update_derived(derived);
		}

		if (should_connect && !is_new) {
			unfreeze_derived_effects(derived);
			reconnect(derived);
		}
	}

	if (batch_values?.has(signal)) {
		return batch_values.get(signal);
	}

	if ((signal.f & ERROR_VALUE) !== 0) {
		throw signal.v;
	}

	return signal.v;
}

/**
 * (Re)connect a disconnected derived, so that it is notified
 * of changes in `mark_reactions`
 * @param {Derived} derived
 */
function reconnect(derived) {
	derived.f |= CONNECTED;

	if (derived.deps === null) return;

	for (const dep of derived.deps) {
		var reactions = dep.reactions;

		if (reactions === null) {
			dep.reactions = [derived];
		} else if (!includes.call(reactions, derived)) {
			reactions.push(derived);
		}

		if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
			unfreeze_derived_effects(/** @type {Derived} */ (dep));
			reconnect(/** @type {Derived} */ (dep));
		}
	}
}

/** @param {Derived} derived */
function depends_on_old_values(derived) {
	if (derived.v === UNINITIALIZED) return true; // we don't know, so assume the worst
	if (derived.deps === null) return false;

	for (const dep of derived.deps) {
		if (old_values.has(dep)) {
			return true;
		}

		if ((dep.f & DERIVED) !== 0 && depends_on_old_values(/** @type {Derived} */ (dep))) {
			return true;
		}
	}

	return false;
}

/**
 * When used inside a [`$derived`](https://svelte.dev/docs/svelte/$derived) or [`$effect`](https://svelte.dev/docs/svelte/$effect),
 * any state read inside `fn` will not be treated as a dependency.
 *
 * ```ts
 * $effect(() => {
 *   // this will run when `data` changes, but not when `time` changes
 *   save(data, {
 *     timestamp: untrack(() => time)
 *   });
 * });
 * ```
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function untrack(fn) {
	var previous_untracking = untracking;
	try {
		untracking = true;
		return fn();
	} finally {
		untracking = previous_untracking;
	}
}

/**
 * Possibly traverse an object and read all its properties so that they're all reactive in case this is `$state`.
 * Does only check first level of an object for performance reasons (heuristic should be good for 99% of all cases).
 * @param {any} value
 * @returns {void}
 */
function deep_read_state(value) {
	if (typeof value !== 'object' || !value || value instanceof EventTarget) {
		return;
	}

	if (STATE_SYMBOL in value) {
		deep_read(value);
	} else if (!Array.isArray(value)) {
		for (let key in value) {
			const prop = value[key];
			if (typeof prop === 'object' && prop && STATE_SYMBOL in prop) {
				deep_read(prop);
			}
		}
	}
}

/**
 * Deeply traverse an object and read all its properties
 * so that they're all reactive in case this is `$state`
 * @param {any} value
 * @param {Set<any>} visited
 * @returns {void}
 */
function deep_read(value, visited = new Set()) {
	if (
		typeof value === 'object' &&
		value !== null &&
		// We don't want to traverse DOM elements
		!(value instanceof EventTarget) &&
		!visited.has(value)
	) {
		visited.add(value);
		// When working with a possible SvelteDate, this
		// will ensure we capture changes to it.
		if (value instanceof Date) {
			value.getTime();
		}
		for (let key in value) {
			try {
				deep_read(value[key], visited);
			} catch (e) {
				// continue
			}
		}
		const proto = get_prototype_of(value);
		if (
			proto !== Object.prototype &&
			proto !== Array.prototype &&
			proto !== Map.prototype &&
			proto !== Set.prototype &&
			proto !== Date.prototype
		) {
			const descriptors = get_descriptors(proto);
			for (let key in descriptors) {
				const get = descriptors[key].get;
				if (get) {
					try {
						get.call(value);
					} catch (e) {
						// continue
					}
				}
			}
		}
	}
}

/**
 * Subset of delegated events which should be passive by default.
 * These two are already passive via browser defaults on window, document and body.
 * But since
 * - we're delegating them
 * - they happen often
 * - they apply to mobile which is generally less performant
 * we're marking them as passive by default for other elements, too.
 */
const PASSIVE_EVENTS = ['touchstart', 'touchmove'];

/**
 * Returns `true` if `name` is a passive event
 * @param {string} name
 */
function is_passive_event(name) {
	return PASSIVE_EVENTS.includes(name);
}

/**
 * Used on elements, as a map of event type -> event handler,
 * and on events themselves to track which element handled an event
 */
const event_symbol = Symbol('events');

/** @type {Set<string>} */
const all_registered_events = new Set();

/** @type {Set<(events: Array<string>) => void>} */
const root_event_handles = new Set();

/**
 * @param {string} event_name
 * @param {EventTarget} dom
 * @param {EventListener} [handler]
 * @param {AddEventListenerOptions} [options]
 */
function create_event(event_name, dom, handler, options = {}) {
	/**
	 * @this {EventTarget}
	 */
	function target_handler(/** @type {Event} */ event) {
		if (!options.capture) {
			// Only call in the bubble phase, else delegated events would be called before the capturing events
			handle_event_propagation.call(dom, event);
		}
		if (!event.cancelBubble) {
			return without_reactive_context(() => {
				return handler?.call(this, event);
			});
		}
	}

	// Chrome has a bug where pointer events don't work when attached to a DOM element that has been cloned
	// with cloneNode() and the DOM element is disconnected from the document. To ensure the event works, we
	// defer the attachment till after it's been appended to the document. TODO: remove this once Chrome fixes
	// this bug. The same applies to wheel events and touch events.
	if (
		event_name.startsWith('pointer') ||
		event_name.startsWith('touch') ||
		event_name === 'wheel'
	) {
		target_handler.__removed = false;
		queue_micro_task(() => {
			if (!target_handler.__removed) {
				dom.addEventListener(event_name, target_handler, options);
			}
		});
	} else {
		dom.addEventListener(event_name, target_handler, options);
	}

	return target_handler;
}

/**
 * @param {string} event_name
 * @param {Element} dom
 * @param {EventListener} [handler]
 * @param {boolean} [capture]
 * @param {boolean} [passive]
 * @returns {void}
 */
function event(event_name, dom, handler, capture, passive) {
	var options = { capture, passive };
	var target_handler = create_event(event_name, dom, handler, options);

	if (
		dom === document.body ||
		// @ts-ignore
		dom === window ||
		// @ts-ignore
		dom === document ||
		// Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
		dom instanceof HTMLMediaElement
	) {
		teardown(() => {
			target_handler.__removed = true;
			dom.removeEventListener(event_name, target_handler, options);
		});
	}
}

/**
 * @param {string} event_name
 * @param {Element} element
 * @param {EventListener} [handler]
 * @returns {void}
 */
function delegated(event_name, element, handler) {
	// @ts-expect-error
	(element[event_symbol] ??= {})[event_name] = handler;
}

/**
 * @param {Array<string>} events
 * @returns {void}
 */
function delegate(events) {
	for (var i = 0; i < events.length; i++) {
		all_registered_events.add(events[i]);
	}

	for (var fn of root_event_handles) {
		fn(events);
	}
}

// used to store the reference to the currently propagated event
// to prevent garbage collection between microtasks in Firefox (<= 141)
// If the event object is GCed too early, the expando __root property
// set on the event object is lost, causing the event delegation
// to process the event twice
let last_propagated_event = null;

// whether a task is already queued to clear `last_propagated_event`
let last_propagated_event_clear_scheduled = false;

/**
 * @this {EventTarget}
 * @param {Event} event
 * @returns {void}
 */
function handle_event_propagation(event) {
	var handler_element = this;
	var owner_document = /** @type {Node} */ (handler_element).ownerDocument;
	var event_name = event.type;
	var path = event.composedPath?.() || [];
	var current_target = /** @type {null | Element} */ (path[0] || event.target);

	last_propagated_event = event;

	// The reference is only needed while the event can still reach another
	// delegated root, i.e. during the current (synchronous) dispatch and its
	// microtask checkpoints. Clearing it in a later task preserves the
	// Firefox workaround while making sure the slot doesn't retain the last
	// event forever — through `event.target` it would otherwise keep the
	// entire detached subtree of whatever the user last clicked in alive
	// until the next delegated event happens to arrive.
	if (!last_propagated_event_clear_scheduled) {
		last_propagated_event_clear_scheduled = true;
		setTimeout(() => {
			last_propagated_event_clear_scheduled = false;
			last_propagated_event = null;
		});
	}

	// composedPath contains list of nodes the event has propagated through.
	// We check `event_symbol` to skip all nodes below it in case this is a
	// parent of the `event_symbol` node, which indicates that there's nested
	// mounted apps. In this case we don't want to trigger events multiple times.
	var path_idx = 0;

	// the `last_propagated_event === event` check is redundant, but
	// without it the variable will be DCE'd and things will
	// fail mysteriously in Firefox
	// @ts-expect-error is added below
	var handled_at = last_propagated_event === event && event[event_symbol];

	if (handled_at) {
		var at_idx = path.indexOf(handled_at);
		if (
			at_idx !== -1 &&
			(handler_element === document || handler_element === /** @type {any} */ (window))
		) {
			// This is the fallback document listener or a window listener, but the event was already handled
			// -> ignore, but set handle_at to document/window so that we're resetting the event
			// chain in case someone manually dispatches the same event object again.
			// @ts-expect-error
			event[event_symbol] = handler_element;
			return;
		}

		// We're deliberately not skipping if the index is higher, because
		// someone could create an event programmatically and emit it multiple times,
		// in which case we want to handle the whole propagation chain properly each time.
		// (this will only be a false negative if the event is dispatched multiple times and
		// the fallback document listener isn't reached in between, but that's super rare)
		var handler_idx = path.indexOf(handler_element);
		if (handler_idx === -1) {
			// handle_idx can theoretically be -1 (happened in some JSDOM testing scenarios with an event listener on the window object)
			// so guard against that, too, and assume that everything was handled at this point.
			return;
		}

		if (at_idx <= handler_idx) {
			path_idx = at_idx;
		}
	}

	current_target = /** @type {Element} */ (path[path_idx] || event.target);
	// there can only be one delegated event per element, and we either already handled the current target,
	// or this is the very first target in the chain which has a non-delegated listener, in which case it's safe
	// to handle a possible delegated event on it later (through the root delegation listener for example).
	if (current_target === handler_element) return;

	// Proxy currentTarget to correct target
	define_property(event, 'currentTarget', {
		configurable: true,
		get() {
			return current_target || owner_document;
		}
	});

	// This started because of Chromium issue https://chromestatus.com/feature/5128696823545856,
	// where removal or moving of the DOM can cause sync `blur` events to fire, which can cause logic
	// to run inside the current `active_reaction`, which isn't what we want at all. However, on reflection,
	// it's probably best that all events handled by Svelte have this behaviour, as we don't really want
	// an event handler to run in the context of another reaction or effect.
	var previous_reaction = active_reaction;
	var previous_effect = active_effect;
	set_active_reaction(null);
	set_active_effect(null);

	try {
		/**
		 * @type {unknown}
		 */
		var throw_error;
		/**
		 * @type {unknown[]}
		 */
		var other_errors = [];

		while (current_target !== null) {
			if (current_target === handler_element) break;

			try {
				// @ts-expect-error
				var delegated = current_target[event_symbol]?.[event_name];

				if (
					delegated != null &&
					(!(/** @type {any} */ (current_target).disabled) ||
						// DOM could've been updated already by the time this is reached, so we check this as well
						// -> the target could not have been disabled because it emits the event in the first place
						event.target === current_target)
				) {
					delegated.call(current_target, event);
				}
			} catch (error) {
				if (throw_error) {
					other_errors.push(error);
				} else {
					throw_error = error;
				}
			}
			if (event.cancelBubble) break;

			path_idx++;
			current_target = path_idx < path.length ? /** @type {Element} */ (path[path_idx]) : null;
		}

		if (throw_error) {
			for (let error of other_errors) {
				// Throw the rest of the errors, one-by-one on a microtask
				queueMicrotask(() => {
					throw error;
				});
			}
			throw throw_error;
		}
	} finally {
		// @ts-expect-error is used above
		event[event_symbol] = handler_element;
		// @ts-ignore remove proxy on currentTarget
		delete event.currentTarget;
		set_active_reaction(previous_reaction);
		set_active_effect(previous_effect);
	}
}

const policy =
	// We gotta write it like this because after downleveling the pure comment may end up in the wrong location
	globalThis?.window?.trustedTypes &&
	/* @__PURE__ */ globalThis.window.trustedTypes.createPolicy('svelte-trusted-html', {
		/** @param {string} html */
		createHTML: (html) => {
			return html;
		}
	});

/** @param {string} html */
function create_trusted_html(html) {
	return /** @type {string} */ (policy?.createHTML(html) ?? html);
}

/**
 * @param {string} html
 */
function create_fragment_from_html(html) {
	var elem = create_element('template');
	elem.innerHTML = create_trusted_html(html.replaceAll('<!>', '<!---->')); // XHTML compliance
	return elem.content;
}

/** @import { Effect, EffectNodes, TemplateNode } from '#client' */
/** @import { TemplateStructure } from './types' */

/**
 * @param {TemplateNode} start
 * @param {TemplateNode | null} end
 */
function assign_nodes(start, end) {
	var effect = /** @type {Effect} */ (active_effect);
	if (effect.nodes === null) {
		effect.nodes = { start, end, a: null, t: null };
	}
}

/**
 * @param {string} content
 * @param {number} flags
 * @returns {() => Node | Node[]}
 */
/*#__NO_SIDE_EFFECTS__*/
function from_html(content, flags) {
	var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
	var use_import_node = (flags & TEMPLATE_USE_IMPORT_NODE) !== 0;

	/** @type {Node} */
	var node;

	/**
	 * Whether or not the first item is a text/element node. If not, we need to
	 * create an additional comment node to act as `effect.nodes.start`
	 */
	var has_start = !content.startsWith('<!>');

	return () => {

		if (node === undefined) {
			node = create_fragment_from_html(has_start ? content : '<!>' + content);
			if (!is_fragment) node = /** @type {TemplateNode} */ (get_first_child(node));
		}

		var clone = /** @type {TemplateNode} */ (
			use_import_node || is_firefox ? document.importNode(node, true) : node.cloneNode(true)
		);

		if (is_fragment) {
			var start = /** @type {TemplateNode} */ (get_first_child(clone));
			var end = /** @type {TemplateNode} */ (clone.lastChild);

			assign_nodes(start, end);
		} else {
			assign_nodes(clone, clone);
		}

		return clone;
	};
}

/**
 * @param {string} content
 * @param {number} flags
 * @param {'svg' | 'math'} ns
 * @returns {() => Node | Node[]}
 */
/*#__NO_SIDE_EFFECTS__*/
function from_namespace(content, flags, ns = 'svg') {
	/**
	 * Whether or not the first item is a text/element node. If not, we need to
	 * create an additional comment node to act as `effect.nodes.start`
	 */
	var has_start = !content.startsWith('<!>');
	var wrapped = `<${ns}>${has_start ? content : '<!>' + content}</${ns}>`;

	/** @type {Element | DocumentFragment} */
	var node;

	return () => {

		if (!node) {
			var fragment = /** @type {DocumentFragment} */ (create_fragment_from_html(wrapped));
			var root = /** @type {Element} */ (get_first_child(fragment));

			{
				node = /** @type {Element} */ (get_first_child(root));
			}
		}

		var clone = /** @type {TemplateNode} */ (node.cloneNode(true));

		{
			assign_nodes(clone, clone);
		}

		return clone;
	};
}

/**
 * @param {string} content
 * @param {number} flags
 */
/*#__NO_SIDE_EFFECTS__*/
function from_svg(content, flags) {
	return from_namespace(content, flags, 'svg');
}

/**
 * Don't mark this as side-effect-free, hydration needs to walk all nodes
 * @param {any} value
 */
function text(value = '') {
	{
		var t = create_text(value + '');
		assign_nodes(t, t);
		return t;
	}
}

/**
 * @returns {TemplateNode | DocumentFragment}
 */
function comment() {

	var frag = document.createDocumentFragment();
	var start = document.createComment('');
	var anchor = create_text();
	frag.append(start, anchor);

	assign_nodes(start, anchor);

	return frag;
}

/**
 * Assign the created (or in hydration mode, traversed) dom elements to the current block
 * and insert the elements into the dom (in client mode).
 * @param {Text | Comment | Element} anchor
 * @param {DocumentFragment | Element} dom
 */
function append(anchor, dom) {

	if (anchor === null) {
		// edge case — void `<svelte:element>` with content
		return;
	}

	anchor.before(/** @type {Node} */ (dom));
}

/**
 * Returns a `subscribe` function that integrates external event-based systems with Svelte's reactivity.
 * It's particularly useful for integrating with web APIs like `MediaQuery`, `IntersectionObserver`, or `WebSocket`.
 *
 * If `subscribe` is called inside an effect (including indirectly, for example inside a getter),
 * the `start` callback will be called with an `update` function. Whenever `update` is called, the effect re-runs.
 *
 * If `start` returns a cleanup function, it will be called when the effect is destroyed.
 *
 * If `subscribe` is called in multiple effects, `start` will only be called once as long as the effects
 * are active, and the returned teardown function will only be called when all effects are destroyed.
 *
 * It's best understood with an example. Here's an implementation of [`MediaQuery`](https://svelte.dev/docs/svelte/svelte-reactivity#MediaQuery):
 *
 * ```js
 * import { createSubscriber } from 'svelte/reactivity';
 * import { on } from 'svelte/events';
 *
 * export class MediaQuery {
 * 	#query;
 * 	#subscribe;
 *
 * 	constructor(query) {
 * 		this.#query = window.matchMedia(`(${query})`);
 *
 * 		this.#subscribe = createSubscriber((update) => {
 * 			// when the `change` event occurs, re-run any effects that read `this.current`
 * 			const off = on(this.#query, 'change', update);
 *
 * 			// stop listening when all the effects are destroyed
 * 			return () => off();
 * 		});
 * 	}
 *
 * 	get current() {
 * 		// This makes the getter reactive, if read in an effect
 * 		this.#subscribe();
 *
 * 		// Return the current state of the query, whether or not we're in an effect
 * 		return this.#query.matches;
 * 	}
 * }
 * ```
 * @param {(update: () => void) => (() => void) | void} start
 * @since 5.7.0
 */
function createSubscriber(start) {
	let subscribers = 0;
	let version = source(0);
	/** @type {(() => void) | void} */
	let stop;

	return () => {
		if (effect_tracking()) {
			get(version);

			render_effect(() => {
				if (subscribers === 0) {
					stop = untrack(() => start(() => increment(version)));
				}

				subscribers += 1;

				return () => {
					queue_micro_task(() => {
						// Only count down after a microtask, else we would reach 0 before our own render effect reruns,
						// but reach 1 again when the tick callback of the prior teardown runs. That would mean we
						// re-subcribe unnecessarily and create a memory leak because the old subscription is never cleaned up.
						subscribers -= 1;

						if (subscribers === 0) {
							stop?.();
							stop = undefined;
							// Increment the version to ensure any dependent deriveds are marked dirty when the subscription is picked up again later.
							// If we didn't do this then the comparison of write versions would determine that the derived has a later version than
							// the subscriber, and it would not be re-run.
							increment(version);
						}
					});
				};
			});
		}
	};
}

/** @import { Effect, Source, TemplateNode, } from '#client' */

/**
 * @typedef {{
 * 	 onerror?: ((error: unknown, reset: () => void) => void) | null;
 *   failed?: ((anchor: Node, error: () => unknown, reset: () => () => void) => void) | null;
 *   pending?: ((anchor: Node) => void) | null;
 * }} BoundaryProps
 */

var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;

/**
 * @param {TemplateNode} node
 * @param {BoundaryProps} props
 * @param {((anchor: Node) => void)} children
 * @param {((error: unknown) => unknown) | undefined} [transform_error]
 * @returns {void}
 */
function boundary(node, props, children, transform_error) {
	new Boundary(node, props, children, transform_error);
}

class Boundary {
	/** @type {Boundary | null} */
	parent;

	is_pending = false;

	/**
	 * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
	 * Inherited from parent boundary, or defaults to identity.
	 * @type {(error: unknown) => unknown}
	 */
	transform_error;

	/** @type {TemplateNode} */
	#anchor;

	/** @type {TemplateNode | null} */
	#hydrate_open = null;

	/** @type {BoundaryProps} */
	#props;

	/** @type {((anchor: Node) => void)} */
	#children;

	/** @type {Effect} */
	#effect;

	/** @type {Effect | null} */
	#main_effect = null;

	/** @type {Effect | null} */
	#pending_effect = null;

	/** @type {Effect | null} */
	#failed_effect = null;

	/** @type {DocumentFragment | null} */
	#offscreen_fragment = null;

	#local_pending_count = 0;
	#pending_count = 0;
	#pending_count_update_queued = false;

	/** @type {Set<Effect>} */
	#dirty_effects = new Set();

	/** @type {Set<Effect>} */
	#maybe_dirty_effects = new Set();

	/**
	 * A source containing the number of pending async deriveds/expressions.
	 * Only created if `$effect.pending()` is used inside the boundary,
	 * otherwise updating the source results in needless `Batch.ensure()`
	 * calls followed by no-op flushes
	 * @type {Source<number> | null}
	 */
	#effect_pending = null;

	#effect_pending_subscriber = createSubscriber(() => {
		this.#effect_pending = source(this.#local_pending_count);

		return () => {
			this.#effect_pending = null;
		};
	});

	/**
	 * @param {TemplateNode} node
	 * @param {BoundaryProps} props
	 * @param {((anchor: Node) => void)} children
	 * @param {((error: unknown) => unknown) | undefined} [transform_error]
	 */
	constructor(node, props, children, transform_error) {
		this.#anchor = node;
		this.#props = props;

		this.#children = (anchor) => {
			var effect = /** @type {Effect} */ (active_effect);

			effect.b = this;
			effect.f |= BOUNDARY_EFFECT;

			children(anchor);
		};

		this.parent = /** @type {Effect} */ (active_effect).b;

		// Inherit transform_error from parent boundary, or use the provided one, or default to identity
		this.transform_error = transform_error ?? this.parent?.transform_error ?? ((e) => e);

		this.#effect = block(() => {
			{
				this.#render();
			}
		}, flags);
	}

	#hydrate_resolved_content() {
		try {
			this.#main_effect = branch(() => this.#children(this.#anchor));
		} catch (error) {
			this.error(error);
		}
	}

	/**
	 * @param {unknown} error The deserialized error from the server's hydration comment
	 */
	#hydrate_failed_content(error) {
		const failed = this.#props.failed;
		const { reset, invoke_onerror } = this.#create_reset(error);

		// `onerror` may mutate state, which is disallowed while hydrating
		queue_micro_task(invoke_onerror);

		if (!failed) return;

		this.#failed_effect = branch(() => {
			failed(
				this.#anchor,
				() => error,
				() => reset
			);
		});
	}

	/**
	 * Creates the `reset` function for a failed boundary, along with a function
	 * that invokes `onerror` with it (if provided)
	 * @param {unknown} error
	 * @returns {{ reset: () => void, invoke_onerror: () => void }}
	 */
	#create_reset(error) {
		var did_reset = false;
		var calling_on_error = false;

		const reset = () => {
			if (this.#is_destroyed()) return;

			if (did_reset) {
				svelte_boundary_reset_noop();
				return;
			}

			did_reset = true;

			if (calling_on_error) {
				svelte_boundary_reset_onerror();
			}

			if (this.#failed_effect !== null) {
				pause_effect(this.#failed_effect, () => {
					this.#failed_effect = null;
				});
			}

			this.#run(() => {
				this.#render();
			});
		};

		const invoke_onerror = () => {
			if (this.#is_destroyed()) return;

			try {
				calling_on_error = true;
				this.#props.onerror?.(error, reset);
				calling_on_error = false;
			} catch (err) {
				invoke_error_boundary(err, this.#effect && this.#effect.parent);
			}
		};

		return { reset, invoke_onerror };
	}

	#is_destroyed() {
		return (this.#effect.f & (DESTROYED | DESTROYING)) !== 0;
	}

	#hydrate_pending_content() {
		const pending = this.#props.pending;
		if (!pending) return;

		this.is_pending = true;
		this.#pending_effect = branch(() => pending(this.#anchor));

		queue_micro_task(() => {
			if (this.#is_destroyed()) return;

			var fragment = (this.#offscreen_fragment = document.createDocumentFragment());
			var anchor = create_text();
			var handled = false;

			fragment.append(anchor);

			this.#main_effect = this.#run(() => {
				try {
					return branch(() => this.#children(anchor));
				} catch (error) {
					try {
						this.error(error);
						handled = true;
					} catch (error) {
						invoke_error_boundary(error, this.#effect.parent);
					}

					return null;
				}
			});

			if (this.#main_effect === null) {
				this.#offscreen_fragment = null;
				if (handled) this.#resolve(/** @type {Batch} */ (current_batch));
				return;
			}

			if (this.#pending_count === 0) {
				this.#anchor.before(fragment);
				this.#offscreen_fragment = null;

				pause_effect(/** @type {Effect} */ (this.#pending_effect), () => {
					this.#pending_effect = null;
				});

				this.#resolve(/** @type {Batch} */ (current_batch));
			}
		});
	}

	#render() {
		try {
			this.is_pending = this.has_pending_snippet();
			this.#pending_count = 0;
			this.#local_pending_count = 0;

			this.#main_effect = branch(() => {
				this.#children(this.#anchor);
			});

			if (this.#pending_count > 0) {
				var fragment = (this.#offscreen_fragment = document.createDocumentFragment());
				move_effect(this.#main_effect, fragment);

				const pending = /** @type {(anchor: Node) => void} */ (this.#props.pending);
				this.#pending_effect = branch(() => pending(this.#anchor));
			} else {
				this.#resolve(/** @type {Batch} */ (current_batch));
			}
		} catch (error) {
			this.error(error);
		}
	}

	/**
	 * @param {Batch} batch
	 */
	#resolve(batch) {
		this.is_pending = false;

		// any effects that were previously deferred should be transferred
		// to the batch, which will flush in the next microtask
		batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
	}

	/**
	 * Defer an effect inside a pending boundary until the boundary resolves
	 * @param {Effect} effect
	 */
	defer_effect(effect) {
		defer_effect(effect, this.#dirty_effects, this.#maybe_dirty_effects);
	}

	/**
	 * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
	 * @returns {boolean}
	 */
	is_rendered() {
		return !this.is_pending && (!this.parent || this.parent.is_rendered());
	}

	has_pending_snippet() {
		return !!this.#props.pending;
	}

	/**
	 * @template T
	 * @param {() => T} fn
	 */
	#run(fn) {
		var previous_effect = active_effect;
		var previous_reaction = active_reaction;
		var previous_ctx = component_context;

		set_active_effect(this.#effect);
		set_active_reaction(this.#effect);
		set_component_context(this.#effect.ctx);

		try {
			Batch.ensure();
			return fn();
		} finally {
			set_active_effect(previous_effect);
			set_active_reaction(previous_reaction);
			set_component_context(previous_ctx);
		}
	}

	/**
	 * Updates the pending count associated with the currently visible pending snippet,
	 * if any, such that we can replace the snippet with content once work is done
	 * @param {1 | -1} d
	 * @param {Batch} batch
	 */
	#update_pending_count(d, batch) {
		if (!this.has_pending_snippet()) {
			if (this.parent) {
				this.parent.#update_pending_count(d, batch);
			}

			// if there's no parent, we're in a scope with no pending snippet
			return;
		}

		this.#pending_count += d;

		if (this.#pending_count === 0) {
			this.#resolve(batch);

			if (this.#pending_effect) {
				pause_effect(this.#pending_effect, () => {
					this.#pending_effect = null;
				});
			}

			if (this.#offscreen_fragment) {
				this.#anchor.before(this.#offscreen_fragment);
				this.#offscreen_fragment = null;
			}
		}
	}

	/**
	 * Update the source that powers `$effect.pending()` inside this boundary,
	 * and controls when the current `pending` snippet (if any) is removed.
	 * Do not call from inside the class
	 * @param {1 | -1} d
	 * @param {Batch} batch
	 */
	update_pending_count(d, batch) {
		this.#update_pending_count(d, batch);

		this.#local_pending_count += d;

		if (!this.#effect_pending || this.#pending_count_update_queued) return;
		this.#pending_count_update_queued = true;

		queue_micro_task(() => {
			this.#pending_count_update_queued = false;
			if (this.#effect_pending) {
				internal_set(this.#effect_pending, this.#local_pending_count);
			}
		});
	}

	get_effect_pending() {
		this.#effect_pending_subscriber();
		return get(/** @type {Source<number>} */ (this.#effect_pending));
	}

	/** @param {unknown} error */
	error(error) {
		if (error === HYDRATION_ERROR) {
			throw error;
		}

		// If we have nothing to capture the error, or if we hit an error while
		// rendering the fallback, re-throw for another boundary to handle
		if (!this.#props.onerror && !this.#props.failed) {
			throw error;
		}

		if (current_batch?.is_fork) {
			if (this.#main_effect) current_batch.skip_effect(this.#main_effect);
			if (this.#pending_effect) current_batch.skip_effect(this.#pending_effect);
			if (this.#failed_effect) current_batch.skip_effect(this.#failed_effect);

			current_batch.oncommit(() => {
				if (!this.#is_destroyed()) this.#handle_error(error);
			});
		} else {
			this.#handle_error(error);
		}
	}

	/**
	 * @param {unknown} error
	 */
	#handle_error(error) {
		if (this.#main_effect) {
			destroy_effect(this.#main_effect);
			this.#main_effect = null;
		}

		if (this.#pending_effect) {
			destroy_effect(this.#pending_effect);
			this.#pending_effect = null;
		}

		if (this.#failed_effect) {
			destroy_effect(this.#failed_effect);
			this.#failed_effect = null;
		}

		let failed = this.#props.failed;

		/** @param {unknown} transformed_error */
		const handle_error_result = (transformed_error) => {
			if (this.#is_destroyed()) return;

			const { reset, invoke_onerror } = this.#create_reset(transformed_error);

			invoke_onerror();

			if (failed && !this.#is_destroyed()) {
				this.#failed_effect = this.#run(() => {
					try {
						return branch(() => {
							// errors in `failed` snippets cause the boundary to error again
							// TODO Svelte 6: revisit this decision, most likely better to go to parent boundary instead
							var effect = /** @type {Effect} */ (active_effect);

							effect.b = this;
							effect.f |= BOUNDARY_EFFECT;

							failed(
								this.#anchor,
								() => transformed_error,
								() => reset
							);
						});
					} catch (error) {
						invoke_error_boundary(error, /** @type {Effect} */ (this.#effect.parent));
						return null;
					}
				});
			}
		};

		queue_micro_task(() => {
			if (this.#is_destroyed()) return;

			// Run the error through the API-level transformError transform (e.g. SvelteKit's handleError)
			/** @type {unknown} */
			var result;
			try {
				result = this.transform_error(error);
			} catch (e) {
				invoke_error_boundary(e, this.#effect && this.#effect.parent);
				return;
			}

			if (
				result !== null &&
				typeof result === 'object' &&
				typeof (/** @type {any} */ (result).then) === 'function'
			) {
				// transformError returned a Promise — wait for it
				/** @type {any} */ (result).then(
					handle_error_result,
					/** @param {unknown} e */
					(e) => invoke_error_boundary(e, this.#effect && this.#effect.parent)
				);
			} else {
				// Synchronous result — handle immediately
				handle_error_result(result);
			}
		});
	}
}

/** @import { ComponentContext, Effect, EffectNodes, TemplateNode } from '#client' */
/** @import { Component, ComponentType, SvelteComponent, MountOptions } from '../../index.js' */

/**
 * @param {Element} text
 * @param {string} value
 * @returns {void}
 */
function set_text(text, value) {
	// For objects, we apply string coercion (which might make things like $state array references in the template reactive) before diffing
	var str = value == null ? '' : typeof value === 'object' ? `${value}` : value;
	// prettier-ignore
	if (str !== (/** @type {any} */ (text)[TEXT_CACHE] ??= text.nodeValue)) {
		/** @type {any} */ (text)[TEXT_CACHE] = str;
		text.nodeValue = `${str}`;
	}
}

/**
 * Mounts a component to the given target and returns the exports and potentially the props (if compiled with `accessors: true`) of the component.
 * Transitions will play during the initial render unless the `intro` option is set to `false`.
 *
 * @template {Record<string, any>} Props
 * @template {Record<string, any>} Exports
 * @param {ComponentType<SvelteComponent<Props>> | Component<Props, Exports, any>} component
 * @param {MountOptions<Props>} options
 * @returns {Exports}
 */
function mount(component, options) {
	return _mount(component, options);
}

/** @type {Map<EventTarget, Map<string, number>>} */
const listeners = new Map();

/**
 * @template {Record<string, any>} Exports
 * @param {ComponentType<SvelteComponent<any>> | Component<any>} Component
 * @param {MountOptions} options
 * @returns {Exports}
 */
function _mount(
	Component,
	{ target, anchor, props = {}, events, context, intro = true, transformError }
) {
	init_operations();

	/** @type {Exports} */
	// @ts-expect-error will be defined because the render effect runs synchronously
	var component = undefined;

	var unmount = component_root(() => {
		var anchor_node = anchor ?? target.appendChild(create_text());

		boundary(
			/** @type {TemplateNode} */ (anchor_node),
			{
				pending: () => {}
			},
			(anchor_node) => {
				push({});
				var ctx = /** @type {ComponentContext} */ (component_context);
				if (context) ctx.c = context;

				if (events) {
					// We can't spread the object or else we'd lose the state proxy stuff, if it is one
					/** @type {any} */ (props).$$events = events;
				}
				// @ts-expect-error the public typings are not what the actual function looks like
				component = Component(anchor_node, props) || mark_as_component();

				pop();
			},
			transformError
		);

		// Setup event delegation _after_ component is mounted - if an error would happen during mount, it would otherwise not be cleaned up
		/** @type {Set<string>} */
		var registered_events = new Set();

		/** @param {Array<string>} events */
		var event_handle = (events) => {
			for (var i = 0; i < events.length; i++) {
				var event_name = events[i];

				if (registered_events.has(event_name)) continue;
				registered_events.add(event_name);

				var passive = is_passive_event(event_name);

				// Add the event listener to both the container and the document.
				// The container listener ensures we catch events from within in case
				// the outer content stops propagation of the event.
				//
				// The document listener ensures we catch events that originate from elements that were
				// manually moved outside of the container (e.g. via manual portals).
				for (const node of [target, document]) {
					var counts = listeners.get(node);

					if (counts === undefined) {
						counts = new Map();
						listeners.set(node, counts);
					}

					var count = counts.get(event_name);

					if (count === undefined) {
						node.addEventListener(event_name, handle_event_propagation, { passive });
						counts.set(event_name, 1);
					} else {
						counts.set(event_name, count + 1);
					}
				}
			}
		};

		event_handle(array_from(all_registered_events));
		root_event_handles.add(event_handle);

		return () => {
			for (var event_name of registered_events) {
				for (const node of [target, document]) {
					var counts = /** @type {Map<string, number>} */ (listeners.get(node));
					var count = /** @type {number} */ (counts.get(event_name));

					if (--count == 0) {
						node.removeEventListener(event_name, handle_event_propagation);
						counts.delete(event_name);

						if (counts.size === 0) {
							listeners.delete(node);
						}
					} else {
						counts.set(event_name, count);
					}
				}
			}

			root_event_handles.delete(event_handle);

			if (anchor_node !== anchor) {
				anchor_node.parentNode?.removeChild(anchor_node);
			}
		};
	});

	mounted_components.set(component, unmount);
	return component;
}

/**
 * References of the components that were mounted or hydrated.
 * Uses a `WeakMap` to avoid memory leaks.
 */
let mounted_components = new WeakMap();

/**
 * Unmounts a component that was previously mounted using `mount` or `hydrate`.
 *
 * Since 5.13.0, if `options.outro` is `true`, [transitions](https://svelte.dev/docs/svelte/transition) will play before the component is removed from the DOM.
 *
 * Returns a `Promise` that resolves after transitions have completed if `options.outro` is true, or immediately otherwise (prior to 5.13.0, returns `void`).
 *
 * ```js
 * import { mount, unmount } from 'svelte';
 * import App from './App.svelte';
 *
 * const app = mount(App, { target: document.body });
 *
 * // later...
 * unmount(app, { outro: true });
 * ```
 * @param {Record<string, any>} component
 * @param {{ outro?: boolean }} [options]
 * @returns {Promise<void>}
 */
function unmount(component, options) {
	const fn = mounted_components.get(component);

	if (fn) {
		mounted_components.delete(component);
		return fn(options);
	}

	return Promise.resolve();
}

/** @import { Effect, TemplateNode } from '#client' */

/**
 * @typedef {{ effect: Effect, fragment: DocumentFragment }} Branch
 */

/**
 * @template Key
 */
class BranchManager {
	/** @type {TemplateNode} */
	anchor;

	/** @type {Map<Batch, Key>} */
	#batches = new Map();

	/**
	 * Map of keys to effects that are currently rendered in the DOM.
	 * These effects are visible and actively part of the document tree.
	 * Example:
	 * ```
	 * {#if condition}
	 * 	foo
	 * {:else}
	 * 	bar
	 * {/if}
	 * ```
	 * Can result in the entries `true->Effect` and `false->Effect`
	 * @type {Map<Key, Effect>}
	 */
	#onscreen = new Map();

	/**
	 * Similar to #onscreen with respect to the keys, but contains branches that are not yet
	 * in the DOM, because their insertion is deferred.
	 * @type {Map<Key, Branch>}
	 */
	#offscreen = new Map();

	/**
	 * Keys of effects that are currently outroing
	 * @type {Set<Key>}
	 */
	#outroing = new Set();

	/**
	 * Whether to pause (i.e. outro) on change, or destroy immediately.
	 * This is necessary for `<svelte:element>`
	 */
	#transition = true;

	/**
	 * @param {TemplateNode} anchor
	 * @param {boolean} transition
	 */
	constructor(anchor, transition = true) {
		this.anchor = anchor;
		this.#transition = transition;
	}

	/**
	 * @param {Batch} batch
	 */
	#commit = (batch) => {
		// if this batch was made obsolete, bail
		if (!this.#batches.has(batch)) return;

		var key = /** @type {Key} */ (this.#batches.get(batch));

		var onscreen = this.#onscreen.get(key);

		if (onscreen) {
			// effect is already in the DOM — abort any current outro
			resume_effect(onscreen);
			this.#outroing.delete(key);
		} else {
			// effect is currently offscreen. put it in the DOM
			var offscreen = this.#offscreen.get(key);

			if (offscreen) {
				// effect could have been outro'ed before through a prior batch — resume if necessary
				resume_effect(offscreen.effect);
				this.#onscreen.set(key, offscreen.effect);
				this.#offscreen.delete(key);

				// remove the anchor...
				/** @type {TemplateNode} */ (offscreen.fragment.lastChild).remove();

				// ...and append the fragment
				this.anchor.before(offscreen.fragment);
				onscreen = offscreen.effect;
			}
		}

		for (const [b, k] of this.#batches) {
			this.#batches.delete(b);

			if (b === batch) {
				// keep values for newer batches
				break;
			}

			const offscreen = this.#offscreen.get(k);

			if (offscreen) {
				// for older batches, destroy offscreen effects
				// as they will never be committed
				destroy_effect(offscreen.effect);
				this.#offscreen.delete(k);
			}
		}

		// outro/destroy all onscreen effects...
		for (const [k, effect] of this.#onscreen) {
			// ...except the one that was just committed
			//    or those that are already outroing (else the transition is aborted and the effect destroyed right away)
			if (k === key || this.#outroing.has(k)) continue;

			const on_destroy = () => {
				const keys = Array.from(this.#batches.values());

				if (keys.includes(k)) {
					// keep the effect offscreen, as another batch will need it
					var fragment = document.createDocumentFragment();
					move_effect(effect, fragment);

					fragment.append(create_text()); // TODO can we avoid this?

					this.#offscreen.set(k, { effect, fragment });
				} else {
					destroy_effect(effect);
				}

				this.#outroing.delete(k);
				this.#onscreen.delete(k);
			};

			if (this.#transition || !onscreen) {
				this.#outroing.add(k);
				pause_effect(effect, on_destroy, false);
			} else {
				on_destroy();
			}
		}
	};

	/**
	 * @param {Batch} batch
	 */
	#discard = (batch) => {
		this.#batches.delete(batch);

		const keys = Array.from(this.#batches.values());

		for (const [k, branch] of this.#offscreen) {
			if (!keys.includes(k)) {
				destroy_effect(branch.effect);
				this.#offscreen.delete(k);
			}
		}
	};

	/**
	 *
	 * @param {any} key
	 * @param {null | ((target: TemplateNode) => void)} fn
	 */
	ensure(key, fn) {
		var batch = /** @type {Batch} */ (current_batch);
		var defer = should_defer_append();

		if (fn && !this.#onscreen.has(key) && !this.#offscreen.has(key)) {
			if (defer) {
				var fragment = document.createDocumentFragment();
				var target = create_text();

				fragment.append(target);

				this.#offscreen.set(key, {
					effect: branch(() => fn(target)),
					fragment
				});
			} else {
				this.#onscreen.set(
					key,
					branch(() => fn(this.anchor))
				);
			}
		}

		this.#batches.set(batch, key);

		if (defer) {
			for (const [k, effect] of this.#onscreen) {
				if (k === key) {
					batch.unskip_effect(effect);
				} else {
					batch.skip_effect(effect);
				}
			}

			for (const [k, branch] of this.#offscreen) {
				if (k === key) {
					batch.unskip_effect(branch.effect);
				} else {
					batch.skip_effect(branch.effect);
				}
			}

			batch.oncommit(this.#commit);
			batch.ondiscard(this.#discard);
		} else {

			this.#commit(batch);
		}
	}
}

/** @import { TemplateNode } from '#client' */

/**
 * @param {TemplateNode} node
 * @param {(branch: (fn: (anchor: Node) => void, key?: number | false) => void) => void} fn
 * @param {boolean} [elseif] True if this is an `{:else if ...}` block rather than an `{#if ...}`, as that affects which transitions are considered 'local'
 * @returns {void}
 */
function if_block(node, fn, elseif = false) {

	var branches = new BranchManager(node);
	var flags = elseif ? EFFECT_TRANSPARENT : 0;

	/**
	 * @param {number | false} key
	 * @param {null | ((anchor: Node) => void)} fn
	 */
	function update_branch(key, fn) {

		branches.ensure(key, fn);
	}

	block(() => {
		var has_branch = false;

		fn((fn, key = 0) => {
			has_branch = true;
			update_branch(key, fn);
		});

		if (!has_branch) {
			update_branch(-1, null);
		}
	}, flags);
}

/** @import { EachItem, EachOutroGroup, EachState, Effect, EffectNodes, MaybeSource, TemplateNode, TransitionManager } from '#client' */
/** @import { Batch } from '../../reactivity/batch.js'; */

// When making substantive changes to this file, validate them with the each block stress test:
// https://svelte.dev/playground/1972b2cf46564476ad8c8c6405b23b7b
// This test also exists in this repo, as `packages/svelte/tests/manual/each-stress-test`

/**
 * @param {any} _
 * @param {number} i
 */
function index(_, i) {
	return i;
}

/**
 * Pause multiple effects simultaneously, and coordinate their
 * subsequent destruction. Used in each blocks
 * @param {EachState} state
 * @param {Effect[]} to_destroy
 * @param {null | Node} controlled_anchor
 */
function pause_effects(state, to_destroy, controlled_anchor) {
	/** @type {TransitionManager[]} */
	var transitions = [];
	var length = to_destroy.length;

	/** @type {EachOutroGroup} */
	var group;
	var remaining = to_destroy.length;

	for (var i = 0; i < length; i++) {
		let effect = to_destroy[i];

		pause_effect(
			effect,
			() => {
				if (group) {
					group.pending.delete(effect);
					group.done.add(effect);

					if (group.pending.size === 0) {
						var groups = /** @type {Set<EachOutroGroup>} */ (state.outrogroups);

						destroy_effects(state, array_from(group.done));
						groups.delete(group);

						if (groups.size === 0) {
							state.outrogroups = null;
						}
					}
				} else {
					remaining -= 1;
				}
			},
			false
		);
	}

	if (remaining === 0) {
		// If we're in a controlled each block (i.e. the block is the only child of an
		// element), and we are removing all items, _and_ there are no out transitions,
		// we can use the fast path — emptying the element and replacing the anchor.
		// Skip the fast path when another batch is still pending on this each block:
		// that batch's keys still reference EachItems in `state.items`, which
		// `destroy_effects` needs to preserve offscreen (see #18610).
		var fast_path =
			transitions.length === 0 && controlled_anchor !== null && state.pending.size === 0;

		if (fast_path) {
			var anchor = /** @type {Element} */ (controlled_anchor);
			var parent_node = /** @type {Element} */ (anchor.parentNode);

			clear_text_content(parent_node);
			parent_node.append(anchor);

			state.items.clear();
		}

		destroy_effects(state, to_destroy, !fast_path);
	} else {
		group = {
			pending: new Set(to_destroy),
			done: new Set()
		};

		(state.outrogroups ??= new Set()).add(group);
	}
}

/**
 * @param {EachState} state
 * @param {Effect[]} to_destroy
 * @param {boolean} remove_dom
 */
function destroy_effects(state, to_destroy, remove_dom = true) {
	/** @type {Set<Effect> | undefined} */
	var preserved_effects;

	// The loop-in-a-loop isn't ideal, but we should only hit this in relatively rare cases
	if (state.pending.size > 0) {
		preserved_effects = new Set();

		for (const keys of state.pending.values()) {
			for (const key of keys) {
				preserved_effects.add(/** @type {EachItem} */ (state.items.get(key)).e);
			}
		}
	}

	for (var i = 0; i < to_destroy.length; i++) {
		var e = to_destroy[i];

		if (preserved_effects?.has(e)) {
			e.f |= EFFECT_OFFSCREEN;

			const fragment = document.createDocumentFragment();
			move_effect(e, fragment);
		} else {
			destroy_effect(to_destroy[i], remove_dom);
		}
	}
}

/** @type {TemplateNode} */
var offscreen_anchor;

/**
 * @template V
 * @param {Element | Comment} node The next sibling node, or the parent node if this is a 'controlled' block
 * @param {number} flags
 * @param {() => V[]} get_collection
 * @param {(value: V, index: number) => any} get_key
 * @param {(anchor: Node, item: MaybeSource<V>, index: MaybeSource<number>) => void} render_fn
 * @param {null | ((anchor: Node) => void)} fallback_fn
 * @returns {void}
 */
function each(node, flags, get_collection, get_key, render_fn, fallback_fn = null) {
	var anchor = node;

	/** @type {Map<any, EachItem>} */
	var items = new Map();

	var is_controlled = (flags & EACH_IS_CONTROLLED) !== 0;

	if (is_controlled) {
		var parent_node = /** @type {Element} */ (node);

		anchor = parent_node.appendChild(create_text());
	}

	/** @type {Effect | null} */
	var fallback = null;

	// TODO: ideally we could use derived for runes mode but because of the ability
	// to use a store which can be mutated, we can't do that here as mutating a store
	// will still result in the collection array being the same from the store
	var each_array = derived_safe_equal(() => {
		var collection = get_collection();

		return /** @type {V[]} */ (
			is_array(collection) ? collection : collection == null ? [] : array_from(collection)
		);
	});

	/** @type {Map<Batch, Set<any>>} */
	var pending = new Map();

	var first_run = true;

	/**
	 * @param {Batch} batch
	 */
	function commit(batch) {
		if ((state.effect.f & DESTROYED) !== 0) {
			return;
		}

		state.pending.delete(batch);

		// The effect doesn't necessarily re-run in a batch right before that batch commits
		// (its view of the collection may not have changed), so we read the collection
		// as the committing batch sees it rather than using the most recent block run's result
		var array = get(each_array);

		state.fallback = fallback;
		reconcile(state, array, anchor, flags, get_key);

		if (fallback !== null) {
			if (array.length === 0) {
				if ((fallback.f & EFFECT_OFFSCREEN) === 0) {
					resume_effect(fallback);
				} else {
					fallback.f ^= EFFECT_OFFSCREEN;
					move(fallback, null, anchor);
				}
			} else {
				pause_effect(fallback, () => {
					// TODO only null out if no pending batch needs it,
					// otherwise re-add `fallback.fragment` and move the
					// effect into it
					fallback = null;
				});
			}
		}
	}

	/**
	 * @param {Batch} batch
	 */
	function discard(batch) {
		state.pending.delete(batch);
	}

	var effect = block(() => {
		var array = /** @type {V[]} */ (get(each_array));
		var length = array.length;

		var keys = new Set();
		var batch = /** @type {Batch} */ (current_batch);
		var defer = should_defer_append();

		for (var index = 0; index < length; index += 1) {

			var value = array[index];
			var key = get_key(value, index);

			var item = first_run ? null : items.get(key);

			if (item) {
				// update before reconciliation, to trigger any async updates
				if (item.v) internal_set(item.v, value);
				if (item.i) internal_set(item.i, index);

				if (defer) {
					batch.unskip_effect(item.e);
				}
			} else {
				item = create_item(
					items,
					first_run ? anchor : (offscreen_anchor ??= create_text()),
					value,
					key,
					index,
					render_fn,
					flags,
					get_collection
				);

				if (!first_run) {
					item.e.f |= EFFECT_OFFSCREEN;
				}

				items.set(key, item);
			}

			keys.add(key);
		}

		if (length === 0 && fallback_fn && !fallback) {
			if (first_run) {
				fallback = branch(() => fallback_fn(anchor));
			} else {
				fallback = branch(() => fallback_fn((offscreen_anchor ??= create_text())));
				fallback.f |= EFFECT_OFFSCREEN;
			}
		}

		if (length > keys.size) {
			{
				// in prod, the additional information isn't printed, so don't bother computing it
				each_key_duplicate();
			}
		}

		if (!first_run) {
			pending.set(batch, keys);

			if (defer) {
				for (const [key, item] of items) {
					if (!keys.has(key)) {
						batch.skip_effect(item.e);
					}
				}

				batch.oncommit(commit);
				batch.ondiscard(discard);
			} else {
				commit(batch);
			}
		}

		// When we mount the each block for the first time, the collection won't be
		// connected to this effect as the effect hasn't finished running yet and its deps
		// won't be assigned. However, it's possible that when reconciling the each block
		// that a mutation occurred and it's made the collection MAYBE_DIRTY, so reading the
		// collection again can provide consistency to the reactive graph again as the deriveds
		// will now be `CLEAN`.
		get(each_array);
	});

	/** @type {EachState} */
	var state = { effect, items, pending, outrogroups: null, fallback };

	first_run = false;
}

/**
 * Skip past any non-branch effects (which could be created with `createSubscriber`, for example) to find the next branch effect
 * @param {Effect | null} effect
 * @returns {Effect | null}
 */
function skip_to_branch(effect) {
	while (effect !== null && (effect.f & BRANCH_EFFECT) === 0) {
		effect = effect.next;
	}
	return effect;
}

/**
 * Add, remove, or reorder items output by an each block as its input changes
 * @template V
 * @param {EachState} state
 * @param {Array<V>} array
 * @param {Element | Comment | Text} anchor
 * @param {number} flags
 * @param {(value: V, index: number) => any} get_key
 * @returns {void}
 */
function reconcile(state, array, anchor, flags, get_key) {
	var is_animated = (flags & EACH_IS_ANIMATED) !== 0;

	var length = array.length;
	var items = state.items;
	var current = skip_to_branch(state.effect.first);

	/** @type {undefined | Set<Effect>} */
	var seen;

	/** @type {Effect | null} */
	var prev = null;

	/** @type {undefined | Set<Effect>} */
	var to_animate;

	/** @type {Effect[]} */
	var matched = [];

	/** @type {Effect[]} */
	var stashed = [];

	/** @type {V} */
	var value;

	/** @type {any} */
	var key;

	/** @type {Effect | undefined} */
	var effect;

	/** @type {number} */
	var i;

	if (is_animated) {
		for (i = 0; i < length; i += 1) {
			value = array[i];
			key = get_key(value, i);
			effect = /** @type {EachItem} */ (items.get(key)).e;

			// offscreen == coming in now, no animation in that case,
			// else this would happen https://github.com/sveltejs/svelte/issues/17181
			if ((effect.f & EFFECT_OFFSCREEN) === 0) {
				effect.nodes?.a?.measure();
				(to_animate ??= new Set()).add(effect);
			}
		}
	}

	for (i = 0; i < length; i += 1) {
		value = array[i];
		key = get_key(value, i);

		effect = /** @type {EachItem} */ (items.get(key)).e;

		if (state.outrogroups !== null) {
			for (const group of state.outrogroups) {
				group.pending.delete(effect);
				group.done.delete(effect);
			}
		}

		if ((effect.f & INERT) !== 0) {
			resume_effect(effect);
			if (is_animated) {
				effect.nodes?.a?.unfix();
				(to_animate ??= new Set()).delete(effect);
			}
		}

		if ((effect.f & EFFECT_OFFSCREEN) !== 0) {
			effect.f ^= EFFECT_OFFSCREEN;

			if (effect === current) {
				move(effect, null, anchor);
			} else {
				var next = prev ? prev.next : current;

				if (effect === state.effect.last) {
					state.effect.last = effect.prev;
				}

				if (effect.prev) effect.prev.next = effect.next;
				if (effect.next) effect.next.prev = effect.prev;
				link(state, prev, effect);
				link(state, effect, next);

				move(effect, next, anchor);
				prev = effect;

				matched = [];
				stashed = [];

				current = skip_to_branch(prev.next);
				continue;
			}
		}

		if (effect !== current) {
			if (seen !== undefined && seen.has(effect)) {
				if (matched.length < stashed.length) {
					// more efficient to move later items to the front
					var start = stashed[0];
					var j;

					prev = start.prev;

					var a = matched[0];
					var b = matched[matched.length - 1];

					for (j = 0; j < matched.length; j += 1) {
						move(matched[j], start, anchor);
					}

					for (j = 0; j < stashed.length; j += 1) {
						seen.delete(stashed[j]);
					}

					link(state, a.prev, b.next);
					link(state, prev, a);
					link(state, b, start);

					current = start;
					prev = b;
					i -= 1;

					matched = [];
					stashed = [];
				} else {
					// more efficient to move earlier items to the back
					seen.delete(effect);
					move(effect, current, anchor);

					link(state, effect.prev, effect.next);
					link(state, effect, prev === null ? state.effect.first : prev.next);
					link(state, prev, effect);

					prev = effect;
				}

				continue;
			}

			matched = [];
			stashed = [];

			while (current !== null && current !== effect) {
				(seen ??= new Set()).add(current);
				stashed.push(current);
				current = skip_to_branch(current.next);
			}

			if (current === null) {
				continue;
			}
		}

		if ((effect.f & EFFECT_OFFSCREEN) === 0) {
			matched.push(effect);
		}

		prev = effect;
		current = skip_to_branch(effect.next);
	}

	if (state.outrogroups !== null) {
		for (const group of state.outrogroups) {
			if (group.pending.size === 0) {
				destroy_effects(state, array_from(group.done));
				state.outrogroups?.delete(group);
			}
		}

		if (state.outrogroups.size === 0) {
			state.outrogroups = null;
		}
	}

	if (current !== null || seen !== undefined) {
		/** @type {Effect[]} */
		var to_destroy = [];

		if (seen !== undefined) {
			for (effect of seen) {
				if ((effect.f & INERT) === 0) {
					to_destroy.push(effect);
				}
			}
		}

		while (current !== null) {
			// If the each block isn't inert, then inert effects are currently outroing and will be removed once the transition is finished
			if ((current.f & INERT) === 0 && current !== state.fallback) {
				to_destroy.push(current);
			}

			current = skip_to_branch(current.next);
		}

		var destroy_length = to_destroy.length;

		if (destroy_length > 0) {
			var controlled_anchor = (flags & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;

			if (is_animated) {
				for (i = 0; i < destroy_length; i += 1) {
					to_destroy[i].nodes?.a?.measure();
				}

				for (i = 0; i < destroy_length; i += 1) {
					to_destroy[i].nodes?.a?.fix();
				}
			}

			pause_effects(state, to_destroy, controlled_anchor);
		}
	}

	if (is_animated) {
		queue_micro_task(() => {
			if (to_animate === undefined) return;
			for (effect of to_animate) {
				effect.nodes?.a?.apply();
			}
		});
	}
}

/**
 * @template V
 * @param {Map<any, EachItem>} items
 * @param {Node} anchor
 * @param {V} value
 * @param {unknown} key
 * @param {number} index
 * @param {(anchor: Node, item: MaybeSource<V>, index: MaybeSource<number>, collection: () => V[]) => void} render_fn
 * @param {number} flags
 * @param {() => V[]} get_collection
 * @returns {EachItem}
 */
function create_item(items, anchor, value, key, index, render_fn, flags, get_collection) {
	var v =
		(flags & EACH_ITEM_REACTIVE) !== 0
			? (flags & EACH_ITEM_IMMUTABLE) === 0
				? mutable_source(value, false, false)
				: source(value)
			: null;

	var i = (flags & EACH_INDEX_REACTIVE) !== 0 ? source(index) : null;

	return {
		v,
		i,
		e: branch(() => {
			render_fn(anchor, v ?? value, i ?? index, get_collection);

			return () => {
				items.delete(key);
			};
		})
	};
}

/**
 * @param {Effect} effect
 * @param {Effect | null} next
 * @param {Text | Element | Comment} anchor
 */
function move(effect, next, anchor) {
	if (!effect.nodes) return;

	var node = effect.nodes.start;
	var end = effect.nodes.end;

	var dest =
		next && (next.f & EFFECT_OFFSCREEN) === 0
			? /** @type {EffectNodes} */ (next.nodes).start
			: anchor;

	while (node !== null) {
		var next_node = /** @type {TemplateNode} */ (get_next_sibling(node));
		dest.before(node);

		if (node === end) {
			return;
		}

		node = next_node;
	}
}

/**
 * @param {EachState} state
 * @param {Effect | null} prev
 * @param {Effect | null} next
 */
function link(state, prev, next) {
	if (prev === null) {
		state.effect.first = next;
	} else {
		prev.next = next;
	}

	if (next === null) {
		state.effect.last = prev;
	} else {
		next.prev = prev;
	}
}

/**
 * @param {Node} anchor
 * @param {{ hash: string, code: string }} css
 */
function append_styles(anchor, css) {
	// Use an effect to ensure `anchor` is in the DOM, otherwise getRootNode() will yield wrong results
	effect(() => {
		// Bit of a hack: branches.js/each.js use offscreen fragments with temporary text nodes that will
		// never be connected to the real dom. Therefore walk up to the branch that has created the component
		// whose styles we want to append, and check its node instead. It will be connected by the time we get here.
		anchor = active_effect?.parent?.nodes?.start ?? anchor;
		var root = anchor.getRootNode();

		var target = /** @type {ShadowRoot} */ (root).host
			? /** @type {ShadowRoot} */ (root)
			: /** @type {Document} */ (root).head ?? /** @type {Document} */ (root.ownerDocument).head;

		// Always querying the DOM is roughly the same perf as additionally checking for presence in a map first assuming
		// that you'll get cache hits half of the time, so we just always query the dom for simplicity and code savings.
		if (!target.querySelector('#' + css.hash)) {
			const style = create_element('style');
			style.id = css.hash;
			style.textContent = css.code;

			target.appendChild(style);
		}
	});
}

/** @import { ActionPayload } from '#client' */

/**
 * @template P
 * @param {Element} dom
 * @param {(dom: Element, value?: P) => ActionPayload<P>} action
 * @param {() => P} [get_value]
 * @returns {void}
 */
function action(dom, action, get_value) {
	effect(() => {
		var payload = untrack(() => action(dom, get_value?.()) || {});

		if (get_value && payload?.update) {
			var inited = false;
			/** @type {P} */
			var prev = /** @type {any} */ ({}); // initialize with something so it's never equal on first run

			render_effect(() => {
				var value = get_value();

				// Action's update method is coarse-grained, i.e. when anything in the passed value changes, update.
				// This works in legacy mode because of mutable_source being updated as a whole, but when using $state
				// together with actions and mutation, it wouldn't notice the change without a deep read.
				deep_read_state(value);

				if (inited && safe_not_equal(prev, value)) {
					prev = value;
					/** @type {Function} */ (payload.update)(value);
				}
			});

			inited = true;
		}

		if (payload?.destroy) {
			return () => /** @type {Function} */ (payload.destroy)();
		}
	});
}

const whitespace = [...' \t\n\r\f\u00a0\u000b\ufeff'];

/**
 * @param {any} value
 * @param {string | null} [hash]
 * @param {Record<string, boolean>} [directives]
 * @returns {string | null}
 */
function to_class(value, hash, directives) {
	var classname = value == null ? '' : '' + value;

	if (directives) {
		for (var key of Object.keys(directives)) {
			if (directives[key]) {
				classname = classname ? classname + ' ' + key : key;
			} else if (classname.length) {
				var len = key.length;
				var a = 0;

				while ((a = classname.indexOf(key, a)) >= 0) {
					var b = a + len;

					if (
						(a === 0 || whitespace.includes(classname[a - 1])) &&
						(b === classname.length || whitespace.includes(classname[b]))
					) {
						classname = (a === 0 ? '' : classname.substring(0, a)) + classname.substring(b + 1);
					} else {
						a = b;
					}
				}
			}
		}
	}

	return classname === '' ? null : classname;
}

/**
 * @param {any} value
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [styles]
 * @returns {string | null}
 */
function to_style(value, styles) {

	return value == null ? null : String(value);
}

/**
 * @param {Element} dom
 * @param {boolean | number} is_html
 * @param {string | null} value
 * @param {string} [hash]
 * @param {Record<string, any>} [prev_classes]
 * @param {Record<string, any>} [next_classes]
 * @returns {Record<string, boolean> | undefined}
 */
function set_class(dom, is_html, value, hash, prev_classes, next_classes) {
	var prev = /** @type {any} */ (dom)[CLASS_CACHE];

	if (
		prev !== value ||
		prev === undefined // for edge case of `class={undefined}`
	) {
		var next_class_name = to_class(value, hash, next_classes);

		{
			// Removing the attribute when the value is only an empty string causes
			// performance issues vs simply making the className an empty string. So
			// we should only remove the class if the value is nullish
			// and there no hash/directives :
			if (next_class_name == null) {
				dom.removeAttribute('class');
			} else {
				dom.className = next_class_name;
			}
		}

		/** @type {any} */ (dom)[CLASS_CACHE] = value;
	} else if (next_classes && prev_classes !== next_classes) {
		for (var key in next_classes) {
			var is_present = !!next_classes[key];

			if (prev_classes == null || is_present !== !!prev_classes[key]) {
				dom.classList.toggle(key, is_present);
			}
		}
	}

	return next_classes;
}

/**
 * @param {Element & ElementCSSInlineStyle} dom
 * @param {string | null} value
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [prev_styles]
 * @param {Record<string, any> | [Record<string, any>, Record<string, any>]} [next_styles]
 */
function set_style(dom, value, prev_styles, next_styles) {
	var prev = /** @type {any} */ (dom)[STYLE_CACHE];

	if (prev !== value) {
		var next_style_attr = to_style(value);

		{
			if (next_style_attr == null) {
				dom.removeAttribute('style');
			} else {
				dom.style.cssText = next_style_attr;
			}
		}

		/** @type {any} */ (dom)[STYLE_CACHE] = value;
	}

	return next_styles;
}

/** @import { Blocker, Effect } from '#client' */

const IS_CUSTOM_ELEMENT = Symbol('is custom element');
const IS_HTML = Symbol('is html');
const PROGRESS_TAG = IS_XHTML ? 'progress' : 'PROGRESS';

/**
 * @param {Element} element
 * @param {any} value
 */
function set_value(element, value) {
	var attributes = get_attributes(element);

	if (
		attributes.value ===
			(attributes.value =
				// treat null and undefined the same for the initial value
				value ?? undefined) ||
		// @ts-expect-error
		// `progress` elements always need their value set when it's `0`
		(element.value === value && (value !== 0 || element.nodeName !== PROGRESS_TAG))
	) {
		return;
	}

	// @ts-expect-error
	element.value = value ?? '';
}

/**
 * @param {Element} element
 * @param {string} attribute
 * @param {string | null} value
 * @param {boolean} [skip_warning]
 */
function set_attribute(element, attribute, value, skip_warning) {
	var attributes = get_attributes(element);

	if (attributes[attribute] === (attributes[attribute] = value)) return;

	if (attribute === 'loading') {
		// @ts-expect-error
		element[LOADING_ATTR_SYMBOL] = value;
	}

	if (value == null) {
		element.removeAttribute(attribute);
	} else if (typeof value !== 'string' && get_setters(element).has(attribute)) {
		// @ts-ignore
		element[attribute] = value;
	} else {
		element.setAttribute(attribute, value);
	}
}

/**
 *
 * @param {Element} element
 */
function get_attributes(element) {
	return /** @type {Record<string | symbol, unknown>} **/ (
		/** @type {any} */ (element)[ATTRIBUTES_CACHE] ??= {
			[IS_CUSTOM_ELEMENT]: element.nodeName.includes('-'),
			[IS_HTML]: element.namespaceURI === NAMESPACE_HTML
		}
	);
}

/** @type {Map<string, Set<string>>} */
var setters_cache = new Map();

/** @param {Element} element */
function get_setters(element) {
	var cache_key = element.getAttribute('is') || element.nodeName;
	var setters = setters_cache.get(cache_key);
	if (setters) return setters;
	setters_cache.set(cache_key, (setters = new Set()));

	var descriptors;
	var proto = element; // In the case of custom elements there might be setters on the instance
	var element_proto = Element.prototype;

	// Stop at Element, from there on there's only unnecessary (and dangerous, like innerHTML) setters we're not interested in
	// Do not use constructor.name here as that's unreliable in some browser environments
	while (element_proto !== proto) {
		descriptors = get_descriptors(proto);

		for (var key in descriptors) {
			if (
				descriptors[key].set &&
				// better safe than sorry, we don't want spread attributes to mess with HTML content
				key !== 'innerHTML' &&
				key !== 'textContent' &&
				key !== 'innerText'
			) {
				setters.add(key);
			}
		}

		proto = get_prototype_of(proto);
	}

	return setters;
}

/** @import { Batch } from '../../../reactivity/batch.js' */

/**
 * @param {HTMLInputElement} input
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_value(input, get, set = get) {
	var batches = new WeakSet();

	listen_to_event_and_reset_event(input, 'input', async (is_reset) => {

		/** @type {any} */
		var value = is_reset ? input.defaultValue : input.value;
		value = is_numberlike_input(input) ? to_number(value) : value;
		set(value);

		if (current_batch !== null) {
			batches.add(current_batch);
		}

		// Because `{#each ...}` blocks work by updating sources inside the flush,
		// we need to wait a tick before checking to see if we should forcibly
		// update the input and reset the selection state
		await tick();

		// Respect any validation in accessors
		if (value !== (value = get())) {
			var start = input.selectionStart;
			var end = input.selectionEnd;
			var length = input.value.length;

			// the value is coerced on assignment
			input.value = value ?? '';

			// Restore selection
			if (end !== null) {
				var new_length = input.value.length;
				// If cursor was at end and new input is longer, move cursor to new end
				if (start === end && end === length && new_length > length) {
					input.selectionStart = new_length;
					input.selectionEnd = new_length;
				} else {
					input.selectionStart = start;
					input.selectionEnd = Math.min(end, new_length);
				}
			}
		}
	});

	if (
		// If we are hydrating and the value has since changed,
		// then use the updated value from the input instead.
		// If defaultValue is set, then value == defaultValue
		// TODO Svelte 6: remove input.value check and set to empty string?
		(untrack(get) == null && input.value)
	) {
		set(is_numberlike_input(input) ? to_number(input.value) : input.value);

		if (current_batch !== null) {
			batches.add(current_batch);
		}
	}

	render_effect(() => {

		var value = get();

		if (input === document.activeElement) {
			// In sync mode render effects are executed during tree traversal -> needs current_batch
			// In async mode render effects are flushed once batch resolved, at which point current_batch is null -> needs previous_batch
			var batch = /** @type {Batch} */ (current_batch);

			// Never rewrite the contents of a focused input. We can get here if, for example,
			// an update is deferred because of async work depending on the input:
			//
			// <input bind:value={query}>
			// <p>{await find(query)}</p>
			if (batches.has(batch)) {
				return;
			}
		}

		if (is_numberlike_input(input) && value === to_number(input.value)) {
			// handles 0 vs 00 case (see https://github.com/sveltejs/svelte/issues/9959)
			return;
		}

		if (input.type === 'date' && !value && !input.value) {
			// Handles the case where a temporarily invalid date is set (while typing, for example with a leading 0 for the day)
			// and prevents this state from clearing the other parts of the date input (see https://github.com/sveltejs/svelte/issues/7897)
			return;
		}

		// don't set the value of the input if it's the same to allow
		// minlength to work properly
		if (value !== input.value) {
			// @ts-expect-error the value is coerced on assignment
			input.value = value ?? '';
		}
	});
}

/**
 * @param {HTMLInputElement} input
 */
function is_numberlike_input(input) {
	var type = input.type;
	return type === 'number' || type === 'range';
}

/**
 * @param {string} value
 */
function to_number(value) {
	return value === '' ? null : +value;
}

/** @import { ComponentContext, Effect } from '#client' */

/**
 * @param {any} bound_value
 * @param {Element} element_or_component
 * @returns {boolean}
 */
function is_bound_this(bound_value, element_or_component) {
	return (
		bound_value === element_or_component || bound_value?.[STATE_SYMBOL] === element_or_component
	);
}

/**
 * @param {any} element_or_component
 * @param {(value: unknown, ...parts: unknown[]) => void} update
 * @param {(...parts: unknown[]) => unknown} get_value
 * @param {() => unknown[]} [get_parts] Set if the this binding is used inside an each block,
 * 										returns all the parts of the each block context that are used in the expression
 * @returns {void}
 */
function bind_this(
	element_or_component = mark_as_component(),
	update,
	get_value,
	get_parts
) {
	var component_effect = /** @type {ComponentContext} */ (component_context).r;
	var parent = /** @type {Effect} */ (active_effect);

	effect(() => {
		/** @type {unknown[]} */
		var old_parts;

		/** @type {unknown[]} */
		var parts;

		render_effect(() => {
			old_parts = parts;
			// We only track changes to the parts, not the value itself to avoid unnecessary reruns.
			parts = get_parts?.() || [];

			untrack(() => {
				if (!is_bound_this(get_value(...parts), element_or_component)) {
					update(element_or_component, ...parts);
					// If this is an effect rerun (cause: each block context changes), then nullify the binding at
					// the previous position if it isn't already taken over by a different effect.
					if (old_parts && is_bound_this(get_value(...old_parts), element_or_component)) {
						update(null, ...old_parts);
					}
				}
			});
		});

		return () => {
			// When the bind:this effect is destroyed, we go up the effect parent chain until we find the last parent effect that is destroyed,
			// or the effect containing the component bind:this is in (whichever comes first). That way we can time the nulling of the binding
			// as close to user/developer expectation as possible.
			// TODO Svelte 6: Decide if we want to keep this logic or just always null the binding in the component effect's teardown
			// (which would be simpler, but less intuitive in some cases, and breaks the `ondestroy-before-cleanup` test)
			let p = parent;
			while (p !== component_effect && p.parent !== null && p.parent.f & DESTROYING) {
				p = p.parent;
			}
			const teardown = () => {
				if (parts && is_bound_this(get_value(...parts), element_or_component)) {
					update(null, ...parts);
				}
			};
			const original_teardown = p.teardown;
			p.teardown = () => {
				teardown();
				original_teardown?.();
			};
		};
	});

	return element_or_component;
}

/** @import { StoreReferencesContainer } from '#client' */
/** @import { Store } from '#shared' */

/**
 * Whether or not the prop currently being read is a store binding, as in
 * `<Child bind:x={$y} />`. If it is, we treat the prop as mutable even in
 * runes mode, and skip `binding_property_non_reactive` validation
 */
let is_store_binding = false;

/**
 * Returns a tuple that indicates whether `fn()` reads a prop that is a store binding.
 * Used to prevent `binding_property_non_reactive` validation false positives and
 * ensure that these props are treated as mutable even in runes mode
 * @template T
 * @param {() => T} fn
 * @returns {[T, boolean]}
 */
function capture_store_binding(fn) {
	var previous_is_store_binding = is_store_binding;

	try {
		is_store_binding = false;
		return [fn(), is_store_binding];
	} finally {
		is_store_binding = previous_is_store_binding;
	}
}

/** @import { Derived, Effect, Source } from './types.js' */

/**
 * This function is responsible for synchronizing a possibly bound prop with the inner component state.
 * It is used whenever the compiler sees that the component writes to the prop, or when it has a default prop_value.
 * @template V
 * @param {Record<string, unknown>} props
 * @param {string} key
 * @param {number} flags
 * @param {V | (() => V)} [fallback]
 * @returns {(() => V | ((arg: V) => V) | ((arg: V, mutation: boolean) => V))}
 */
function prop(props, key, flags, fallback) {
	var runes = true;
	var bindable = (flags & PROPS_IS_BINDABLE) !== 0;
	var lazy = (flags & PROPS_IS_LAZY_INITIAL) !== 0;

	var fallback_value = /** @type {V} */ (fallback);
	var fallback_dirty = true;
	var fallback_signal = /** @type {Derived<V> | undefined} */ (undefined);

	var get_fallback = () => {
		if (lazy && runes) {
			fallback_signal ??= derived(/** @type {() => V} */ (fallback));
			return get(fallback_signal);
		}

		if (fallback_dirty) {
			fallback_dirty = false;

			fallback_value = lazy
				? untrack(/** @type {() => V} */ (fallback))
				: /** @type {V} */ (fallback);
		}

		return fallback_value;
	};

	/** @type {((v: V) => void) | undefined} */
	let setter;

	if (bindable) {
		// Can be the case when someone does `mount(Component, props)` with `let props = $state({...})`
		// or `createClassComponent(Component, props)`
		var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;

		setter =
			get_descriptor(props, key)?.set ??
			(is_entry_props && key in props ? (v) => (props[key] = v) : undefined);
	}

	/** @type {V} */
	var initial_value;
	var is_store_sub = false;

	if (bindable) {
		[initial_value, is_store_sub] = capture_store_binding(() => /** @type {V} */ (props[key]));
	} else {
		initial_value = /** @type {V} */ (props[key]);
	}

	if (initial_value === undefined && fallback !== undefined) {
		initial_value = get_fallback();

		if (setter) {
			props_invalid_value();
			setter(initial_value);
		}
	}

	/** @type {() => V} */
	var getter;

	{
		getter = () => {
			var value = /** @type {V} */ (props[key]);
			if (value === undefined) return get_fallback();
			fallback_dirty = true;
			return value;
		};
	}

	// prop is never written to — we only need a getter
	if ((flags & PROPS_IS_UPDATED) === 0) {
		return getter;
	}

	// prop is written to, but the parent component had `bind:foo` which
	// means we can just call `$$props.foo = value` directly
	if (setter) {
		var legacy_parent = props.$$legacy;
		return /** @type {() => V} */ (
			function (/** @type {V} */ value, /** @type {boolean} */ mutation) {
				if (arguments.length > 0) {
					// We don't want to notify if the value was mutated and the parent is in runes mode.
					// In that case the state proxy (if it exists) should take care of the notification.
					// If the parent is not in runes mode, we need to notify on mutation, too, that the prop
					// has changed because the parent will not be able to detect the change otherwise.
					if (!mutation || legacy_parent || is_store_sub) {
						/** @type {Function} */ (setter)(mutation ? getter() : value);
					}

					return value;
				}

				return getter();
			}
		);
	}

	// Either prop is written to, but there's no binding, which means we
	// create a derived that we can write to locally.
	// Or we are in legacy mode where we always create a derived to replicate that
	// Svelte 4 did not trigger updates when a primitive value was updated to the same value.
	var overridden = false;

	var d = ((flags & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(() => {
		overridden = false;
		return getter();
	});

	// Capture the initial value if it's bindable
	if (bindable) get(d);

	var parent_effect = /** @type {Effect} */ (active_effect);

	return /** @type {() => V} */ (
		function (/** @type {any} */ value, /** @type {boolean} */ mutation) {
			if (arguments.length > 0) {
				const new_value = mutation ? get(d) : bindable ? proxy(value) : value;

				set(d, new_value);
				overridden = true;

				if (fallback_value !== undefined) {
					fallback_value = new_value;
				}

				return value;
			}

			// special case — avoid recalculating the derived if we're in a
			// teardown function and the prop was overridden locally, or the
			// component was already destroyed (people could access props in a timeout)
			if ((is_destroying_effect && overridden) || (parent_effect.f & DESTROYED) !== 0) {
				return d.v;
			}

			return get(d);
		}
	);
}

/** @import { ComponentContext, ComponentContextLegacy } from '#client' */
/** @import { EventDispatcher } from './index.js' */
/** @import { NotFunction } from './internal/types.js' */

/**
 * `onMount`, like [`$effect`](https://svelte.dev/docs/svelte/$effect), schedules a function to run as soon as the component has been mounted to the DOM.
 * Unlike `$effect`, the provided function only runs once.
 *
 * It must be called during the component's initialisation (but doesn't need to live _inside_ the component;
 * it can be called from an external module). If a function is returned _synchronously_ from `onMount`,
 * it will be called when the component is unmounted.
 *
 * `onMount` functions do not run during [server-side rendering](https://svelte.dev/docs/svelte/svelte-server#render).
 *
 * @template T
 * @param {() => NotFunction<T> | Promise<NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
	if (component_context === null) {
		lifecycle_outside_component();
	}

	{
		user_effect(() => {
			const cleanup = untrack(fn);
			if (typeof cleanup === 'function') return /** @type {() => void} */ (cleanup);
		});
	}
}

const NS = "orbit-launcher";
const SELF = "space.sternenhof.wallpaper";
const FAV_KEY = "favorites";
const HIDDEN_KEY = "hidden";
const RAIL_KEY = "railAlwaysVisible";
const ANCHOR_KEY = "sectionAnchor";
const RAILH_KEY = "railHeight";
const WAVE_KEY = "waveStrength";
const ICONSIZE_KEY = "iconSize";
const LABELSCALE_KEY = "labelScale";
const SHOWICONS_KEY = "showIcons";
const SHOWLABELS_KEY = "showLabels";
const LEFTPAD_KEY = "leftPad";
const SHOWWIDGETS_KEY = "showWidgets";
const ICON_MAX = 144;
class LauncherManager {
  constructor(app) {
    this.app = app;
    this.cap = app.capabilities.get("launcher");
  }
  cap;
  /** Set by the Home view while mounted; lets the gear open its settings. */
  onOpenSettings = null;
  /** Consumed by Home on mount when the view is opened to show settings. */
  wantSettings = false;
  /** Open the launcher settings now (live) or on next mount. */
  requestSettings() {
    this.wantSettings = true;
    this.onOpenSettings?.();
  }
  /** Cached object URLs per package so the same icon isn't decoded twice. */
  iconCache = /* @__PURE__ */ new Map();
  appsCache = null;
  /** Whether real launcher powers exist on this platform (Android app only). */
  get hasLauncher() {
    return this.app.capabilities.has("launcher");
  }
  /** All launchable apps (sorted by label), cached. Empty without the capability. */
  async listApps(force = false) {
    if (!this.cap) return [];
    if (!force && this.appsCache) return this.appsCache;
    this.appsCache = await this.cap.listApps();
    return this.appsCache;
  }
  /** Orbit's own package name — used to open the Orbit app instead of launching. */
  get selfPackage() {
    return SELF;
  }
  /** System apps plus Orbit itself (so the user can open the Orbit app). */
  async allApps() {
    const apps = await this.listApps();
    if (apps.some((a) => a.packageName === SELF)) return apps;
    return [...apps, { packageName: SELF, label: "Orbit" }];
  }
  /** Launch an app by package name; false if it couldn't be started. */
  async launch(packageName) {
    if (!this.cap) return false;
    return this.cap.launch(packageName);
  }
  async uninstall(packageName) {
    await this.cap?.uninstall(packageName);
  }
  async appInfo(packageName) {
    await this.cap?.appInfo(packageName);
  }
  /** Resolve (and cache) an app icon to an object URL, or null if unavailable. */
  async iconUrl(packageName) {
    if (!this.cap) return null;
    const cached = this.iconCache.get(packageName);
    if (cached) return cached;
    const url = await this.cap.iconUrl(packageName, ICON_MAX);
    if (url) this.iconCache.set(packageName, url);
    return url;
  }
  // ---- Favourites (persisted package names) --------------------------------
  /** Pinned package names, in the order the user added them. */
  favorites() {
    return this.app.config.get(NS, FAV_KEY) ?? [];
  }
  isFavorite(packageName) {
    return this.favorites().includes(packageName);
  }
  /** Favourite apps resolved against the installed list (drops uninstalled/hidden). */
  async favoriteApps() {
    const favs = this.favorites();
    if (favs.length === 0) return [];
    const apps = await this.allApps();
    const byPkg = new Map(apps.map((a) => [a.packageName, a]));
    return favs.map((pkg) => byPkg.get(pkg)).filter((a) => !!a && !this.isHidden(a.packageName));
  }
  toggleFavorite(packageName) {
    const favs = this.favorites();
    const next = favs.includes(packageName) ? favs.filter((p) => p !== packageName) : [...favs, packageName];
    this.app.config.set(NS, FAV_KEY, next);
  }
  // ---- Hidden apps ---------------------------------------------------------
  hidden() {
    return this.app.config.get(NS, HIDDEN_KEY) ?? [];
  }
  isHidden(packageName) {
    return this.hidden().includes(packageName);
  }
  toggleHidden(packageName) {
    const h = this.hidden();
    const next = h.includes(packageName) ? h.filter((p) => p !== packageName) : [...h, packageName];
    this.app.config.set(NS, HIDDEN_KEY, next);
  }
  // ---- Grouped list (★ favourites, then A–Z, then #) -----------------------
  letterOf(label) {
    const base = (label.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0] ?? "#").toUpperCase();
    return /[A-Z]/.test(base) ? base : "#";
  }
  /** The app list grouped for display: favourites first, then letter buckets. */
  async sections() {
    const apps = (await this.allApps()).filter((a) => !this.isHidden(a.packageName));
    const out = [];
    const favs = await this.favoriteApps();
    out.push({ key: "★", label: "Favoriten", apps: favs });
    const groups = /* @__PURE__ */ new Map();
    for (const a of apps) {
      const k = this.letterOf(a.label);
      (groups.get(k) ?? groups.set(k, []).get(k)).push(a);
    }
    const letters = [...groups.keys()].sort(
      (a, b) => a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
    );
    for (const k of letters) out.push({ key: k, label: k, apps: groups.get(k) });
    return out;
  }
  // ---- Rail visibility preference ------------------------------------------
  /** Whether the A–Z scrubber is always on screen (default) or edge-revealed. */
  railAlwaysVisible() {
    return this.app.config.get(NS, RAIL_KEY) ?? true;
  }
  setRailAlwaysVisible(on) {
    this.app.config.set(NS, RAIL_KEY, on);
  }
  /** Where a jumped-to letter section lands vertically (0 = top … 1 = bottom). */
  sectionAnchor() {
    return this.app.config.get(NS, ANCHOR_KEY) ?? 0.17;
  }
  setSectionAnchor(v) {
    this.app.config.set(NS, ANCHOR_KEY, v);
  }
  /** Scrubber band height as a fraction of the available height (centred). */
  railHeight() {
    return this.app.config.get(NS, RAILH_KEY) ?? 0.56;
  }
  setRailHeight(v) {
    this.app.config.set(NS, RAILH_KEY, v);
  }
  /** Vertical centre of the swipe rail (0 = top … 1 = bottom). Set via the grip. */
  railPos() {
    return this.app.config.get(NS, "railPos") ?? 0.65;
  }
  setRailPos(v) {
    this.app.config.set(NS, "railPos", v);
  }
  /** Home divider: fraction of the screen where favourites start (widgets above). */
  homeSplit() {
    return this.app.config.get(NS, "homeSplit") ?? 0.39;
  }
  setHomeSplit(v) {
    this.app.config.set(NS, "homeSplit", v);
  }
  /** Show the letter bubble while scrubbing. */
  bubbleVisible() {
    return this.app.config.get(NS, "bubbleVisible") ?? true;
  }
  setBubbleVisible(on) {
    this.app.config.set(NS, "bubbleVisible", on);
  }
  /** Diameter of the letter bubble in px. */
  bubbleSize() {
    return this.app.config.get(NS, "bubbleSize") ?? 52;
  }
  setBubbleSize(v) {
    this.app.config.set(NS, "bubbleSize", v);
  }
  /** Distance of the letter bubble from the right screen edge (px). */
  bubbleRight() {
    return this.app.config.get(NS, "bubbleRight") ?? 88;
  }
  setBubbleRight(v) {
    this.app.config.set(NS, "bubbleRight", v);
  }
  /** Distance of the swipe rail from the right screen edge (px). */
  railRight() {
    return this.app.config.get(NS, "railRight") ?? 12;
  }
  setRailRight(v) {
    this.app.config.set(NS, "railRight", v);
  }
  /** Font family for app names + the rail letters ('' = system default). */
  fontFamily() {
    return this.app.config.get(NS, "fontFamily") ?? "";
  }
  setFontFamily(v) {
    this.app.config.set(NS, "fontFamily", v);
  }
  /** Launcher-local colour overrides per role ('' = auto/inherit global, 'skwd', or hex). */
  colors() {
    return this.app.config.get(NS, "colors") ?? {};
  }
  setColor(key, value) {
    const c = { ...this.colors() };
    if (value) c[key] = value;
    else delete c[key];
    this.app.config.set(NS, "colors", c);
  }
  /** Enabled widgets in the home widget area, in order. */
  widgets() {
    return this.app.config.get(NS, "widgets") ?? ["clock", "date"];
  }
  setWidgets(list) {
    this.app.config.set(NS, "widgets", list);
  }
  toggleWidget(id) {
    const w = this.widgets();
    this.setWidgets(w.includes(id) ? w.filter((x) => x !== id) : [...w, id]);
  }
  /** Horizontal arc multiplier (how far letters bow left around the finger). */
  waveStrength() {
    return this.app.config.get(NS, WAVE_KEY) ?? 1;
  }
  setWaveStrength(v) {
    this.app.config.set(NS, WAVE_KEY, v);
  }
  /** Vertical spread (how far letters push up/down away from the finger). */
  verticalSpread() {
    return this.app.config.get(NS, "verticalSpread") ?? 0.4;
  }
  setVerticalSpread(v) {
    this.app.config.set(NS, "verticalSpread", v);
  }
  /** App icon size in px. */
  iconSize() {
    return this.app.config.get(NS, ICONSIZE_KEY) ?? 36;
  }
  setIconSize(v) {
    this.app.config.set(NS, ICONSIZE_KEY, v);
  }
  /** App label font-size multiplier. */
  labelScale() {
    return this.app.config.get(NS, LABELSCALE_KEY) ?? 0.9;
  }
  setLabelScale(v) {
    this.app.config.set(NS, LABELSCALE_KEY, v);
  }
  /** Rail-letter font-size multiplier (independent of the app labels). */
  railLabelScale() {
    return this.app.config.get(NS, "railLabelScale") ?? 1.15;
  }
  setRailLabelScale(v) {
    this.app.config.set(NS, "railLabelScale", v);
  }
  /** Show app icons in the list. */
  showIcons() {
    return this.app.config.get(NS, SHOWICONS_KEY) ?? true;
  }
  setShowIcons(on) {
    this.app.config.set(NS, SHOWICONS_KEY, on);
  }
  /** Show app names in the list. */
  showLabels() {
    return this.app.config.get(NS, SHOWLABELS_KEY) ?? true;
  }
  setShowLabels(on) {
    this.app.config.set(NS, SHOWLABELS_KEY, on);
  }
  /** Distance of the app list from the left screen edge (px). */
  leftPad() {
    return this.app.config.get(NS, LEFTPAD_KEY) ?? 20;
  }
  setLeftPad(v) {
    this.app.config.set(NS, LEFTPAD_KEY, v);
  }
  /** Top widget area visible (clock etc.). Widgets become swappable in a later block. */
  showWidgets() {
    return this.app.config.get(NS, SHOWWIDGETS_KEY) ?? true;
  }
  setShowWidgets(on) {
    this.app.config.set(NS, SHOWWIDGETS_KEY, on);
  }
  /** Haptic tick while scrubbing the A–Z rail (native only). */
  hapticsEnabled() {
    return this.app.config.get(NS, "haptics") ?? true;
  }
  setHapticsEnabled(on) {
    this.app.config.set(NS, "haptics", on);
  }
  /** All launcher appearance settings as a flat object — for "save as default". */
  appearanceSnapshot() {
    return {
      railAlwaysVisible: this.railAlwaysVisible(),
      sectionAnchor: this.sectionAnchor(),
      railHeight: this.railHeight(),
      railPos: this.railPos(),
      homeSplit: this.homeSplit(),
      bubbleVisible: this.bubbleVisible(),
      bubbleSize: this.bubbleSize(),
      bubbleRight: this.bubbleRight(),
      railRight: this.railRight(),
      fontFamily: this.fontFamily(),
      railLabelScale: this.railLabelScale(),
      widgets: this.widgets(),
      colors: JSON.stringify(this.colors()),
      waveStrength: this.waveStrength(),
      verticalSpread: this.verticalSpread(),
      iconSize: this.iconSize(),
      labelScale: this.labelScale(),
      showIcons: this.showIcons(),
      showLabels: this.showLabels(),
      leftPad: this.leftPad(),
      showWidgets: this.showWidgets(),
      hapticsEnabled: this.hapticsEnabled()
    };
  }
  // ---- Default-launcher helpers --------------------------------------------
  async isDefaultLauncher() {
    return this.cap ? this.cap.isDefaultLauncher() : false;
  }
  async openDefaultLauncherSettings() {
    if (this.cap) await this.cap.openDefaultLauncherSettings();
  }
  /** Release cached icon object URLs (call on plugin unload). */
  dispose() {
    for (const url of this.iconCache.values()) URL.revokeObjectURL(url);
    this.iconCache.clear();
    this.appsCache = null;
  }
}

// generated during release, do not modify

const PUBLIC_VERSION = '5';

if (typeof window !== 'undefined') {
	// @ts-expect-error
	((window.__svelte ??= {}).v ??= new Set()).add(PUBLIC_VERSION);
}

var root$2 = from_svg(`<path></path>`);
var root_1$2 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg>`);

function Icon($$anchor, $$props) {
	push($$props, true);

	// Minimal inline icon set (stroke-based, 24px grid). Plugins reference
	// icons by name; unknown names fall back to a neutral dot.
	let size = prop($$props, 'size', 3, 20);

	const paths = {
		folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
		chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
		notes: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
		palette: 'M12 3a9 9 0 1 0 0 18 2 2 0 0 0 2-2 2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-8z M7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
		settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
		plugin: 'M10 3v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3 M4 10h4a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H4 M6 6l12 12',
		close: 'M18 6 6 18M6 6l12 12',
		search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
		menu: 'M4 6h16M4 12h16M4 18h16',
		home: 'M3 11l9-8 9 8M5 10v10h14V10',
		calendar: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4',
		image: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
		sync: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M18 4v5h-5M6 20v-5h5',
		upload: 'M12 16V4M7 9l5-5 5 5 M5 20h14',
		trash: 'M4 7h16M10 11v6M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
		grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
		hexagon: 'M12 3l7 4v10l-7 4-7-4V7z',
		rows: 'M4 6h16M4 12h16M4 18h16',
		'chevron-left': 'M15 6l-6 6 6 6',
		'chevron-right': 'M9 6l6 6-6 6',
		check: 'M20 6L9 17l-5-5',
		plus: 'M12 5v14M5 12h14',
		lock: 'M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3',
		heart: 'M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3 1 4 2.5C11 6 12 5 14 5c3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20z',
		star: 'M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 21l1.2-6.5L2.5 9.9 9.1 9z',
		filter: 'M3 5h18l-7 8v6l-4-2v-4z',
		sort: 'M4 6h10M4 12h7M4 18h4M17 5v14M17 19l3-3M17 19l-3-3',
		sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6L4.5 4.5M19.5 4.5L18 6M6 18l-1.5 1.5M18 18l1.5 1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
		moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
		'theme-auto': 'M12 3a9 9 0 0 0 0 18zM12 3a9 9 0 0 1 0 18',
		film: 'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16'
	};

	let d = user_derived(() => paths[$$props.name] ?? 'M12 12h.01');
	var svg = root_1$2();

	each(svg, 21, () => get(d).split(' M').map((p, i) => i === 0 ? p : 'M' + p), index, ($$anchor, segment) => {
		var path = root$2();

		template_effect(() => set_attribute(path, 'd', get(segment)));
		append($$anchor, path);
	});

	template_effect(() => {
		set_attribute(svg, 'width', size());
		set_attribute(svg, 'height', size());
	});

	append($$anchor, svg);
	pop();
}

var root$1 = from_html(`<button> </button>`);
var root_1$1 = from_html(`<button>SKWD</button>`);
var root_2$1 = from_html(`<input type="color" class="svelte-x3p18c"/>`);
var root_3$1 = from_html(`<div class="crow svelte-x3p18c"><span class="sw svelte-x3p18c"></span> <span class="clabel svelte-x3p18c"> </span> <div class="cctl svelte-x3p18c"><div class="seg svelte-x3p18c"><!> <button>Fest</button> <!></div> <!></div></div>`);
var root_4$1 = from_html(`<div class="colors svelte-x3p18c"></div>`);

const $$css$1 = {
	hash: 'svelte-x3p18c',
	code: '.colors.svelte-x3p18c {display:flex;flex-direction:column;gap:6px;}.crow.svelte-x3p18c {display:flex;align-items:center;gap:12px;padding:6px 0;flex-wrap:wrap;}.sw.svelte-x3p18c {width:22px;height:22px;border-radius:6px;border:1px solid color-mix(in srgb, var(--text) 25%, transparent);flex:none;}.clabel.svelte-x3p18c {flex:1;min-width:90px;font-size:0.95rem;color:var(--text);}.cctl.svelte-x3p18c {display:flex;align-items:center;gap:10px;}.seg.svelte-x3p18c {display:flex;border:1px solid var(--border, color-mix(in srgb, var(--text) 18%, transparent));border-radius:10px;overflow:hidden;}.seg.svelte-x3p18c button:where(.svelte-x3p18c) {padding:6px 12px;background:transparent;border:none;color:var(--text-muted, color-mix(in srgb, var(--text) 55%, transparent));font-size:0.82rem;cursor:pointer;}.seg.svelte-x3p18c button.on:where(.svelte-x3p18c) {background:var(--accent);color:#fff;}input[type=\'color\'].svelte-x3p18c {width:38px;height:30px;border:1px solid var(--border, color-mix(in srgb, var(--text) 18%, transparent));border-radius:8px;background:transparent;cursor:pointer;}'
};

function ColorMenu($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$1);

	// Reusable colour menu: per role choose Auto (inherit) / a fixed colour / the
	// live wallpaper palette ("SKWD Wall"). Used both globally (Orbit-wide) and
	// per plugin; the parent supplies get/set so the target (global tokens vs a
	// plugin's local vars) is up to the caller.
	/** Current stored value per key: '' = auto/default, 'skwd', or a hex colour. */
	/** Whether the "SKWD Wall" source is offered (its palette is available). */
	/** Label for the clear/inherit option ('Auto' per-plugin, 'Standard' global).
	 *  Omitted → no clear button (only fixed/plugin sources). */
	let skwdAvailable = prop($$props, 'skwdAvailable', 3, false);

	function source(key) {
		const v = $$props.get(key);

		return v === '' ? 'auto' : v === 'skwd' ? 'skwd' : 'fixed';
	}

	var div = root_4$1();

	each(div, 21, () => $$props.roles, (r) => r.key, ($$anchor, r) => {
		var div_1 = root_3$1();
		var span = child(div_1);
		var span_1 = sibling(span, 2);
		var text = only_child(span_1, true);
		var div_2 = sibling(span_1, 2);
		var div_3 = child(div_2);
		var node = child(div_3);

		{
			var consequent = ($$anchor) => {
				var button = root$1();
				let classes;
				var text_1 = only_child(button, true);

				template_effect(
					($0) => {
						classes = set_class(button, 1, 'svelte-x3p18c', null, classes, { on: $0 });
						set_text(text_1, $$props.autoLabel);
					},
					[() => source(get(r).key) === 'auto']
				);

				delegated('click', button, () => $$props.set(get(r).key, ''));
				append($$anchor, button);
			};

			if_block(node, ($$render) => {
				if ($$props.autoLabel) $$render(consequent);
			});
		}

		var button_1 = sibling(node, 2);
		let classes_1;
		var node_1 = sibling(button_1, 2);

		{
			var consequent_1 = ($$anchor) => {
				var button_2 = root_1$1();
				let classes_2;

				template_effect(($0) => classes_2 = set_class(button_2, 1, 'svelte-x3p18c', null, classes_2, { on: $0 }), [() => source(get(r).key) === 'skwd']);
				delegated('click', button_2, () => $$props.set(get(r).key, 'skwd'));
				append($$anchor, button_2);
			};

			if_block(node_1, ($$render) => {
				if (skwdAvailable()) $$render(consequent_1);
			});
		}

		var node_2 = sibling(div_3, 2);

		{
			var consequent_2 = ($$anchor) => {
				var input = root_2$1();

				template_effect(
					($0) => {
						set_value(input, $0);
						set_attribute(input, 'aria-label', get(r).label);
					},
					[() => $$props.get(get(r).key)]
				);

				delegated('input', input, (e) => $$props.set(get(r).key, e.currentTarget.value));
				append($$anchor, input);
			};

			var d = user_derived(() => source(get(r).key) === 'fixed');

			if_block(node_2, ($$render) => {
				if (get(d)) $$render(consequent_2);
			});
		}

		template_effect(
			($0) => {
				set_style(span, `background: var(--${get(r).key ?? ''});`);
				set_text(text, get(r).label);
				classes_1 = set_class(button_1, 1, 'svelte-x3p18c', null, classes_1, { on: $0 });
			},
			[() => source(get(r).key) === 'fixed']
		);

		delegated('click', button_1, () => $$props.set(get(r).key, source(get(r).key) === 'fixed' ? $$props.get(get(r).key) : '#ff6b35'));
		append($$anchor, div_1);
	});
	append($$anchor, div);
	pop();
}

delegate(['click', 'input']);

var root = from_html(`<div class="time svelte-13s71iz"> </div>`);
var root_1 = from_html(`<div class="date svelte-13s71iz"> </div>`);
var root_2 = from_html(`<div class="batt svelte-13s71iz"> </div>`);
var root_3 = from_html(`<span class="aw-broken-hint svelte-13s71iz"><!> Widget nicht verfügbar · lange halten zum Entfernen</span>`);
var root_4 = from_html(`<div><!></div>`);
var root_5 = from_html(`<header><!> <!></header>`);
var root_6 = from_html(`<div class="split-spacer svelte-13s71iz"></div>`);
var root_7 = from_html(`<div class="group-label svelte-13s71iz"> </div>`);
var root_8 = from_html(`<img class="app-icon svelte-13s71iz" alt=""/>`);
var root_9 = from_html(`<span class="app-icon fallback svelte-13s71iz"> </span>`);
var root_10 = from_html(`<span class="app-label svelte-13s71iz"> </span>`);
var root_11 = from_html(`<button class="app svelte-13s71iz"><!> <!></button>`);
var root_12 = from_html(`<section><!> <!></section>`);
var root_13 = from_html(`<footer class="foot svelte-13s71iz"><button class="foot-item svelte-13s71iz"><!> Einstellungen</button> <button class="foot-item svelte-13s71iz"><!> Orbit-App öffnen</button></footer>`);
var root_14 = from_html(`<!> <!>`, 1);
var root_15 = from_html(`<p class="hint svelte-13s71iz">Apps werden geladen…</p>`);

var root_16 = from_html(`<p class="hint svelte-13s71iz">Der App-Zugriff läuft nur in der Android-App von Orbit. Hier siehst du die
        Uhr-Vorschau.</p>`);

var root_17 = from_html(`<span> </span>`);
var root_18 = from_html(`<div class="bubble svelte-13s71iz"> </div>`);
var root_19 = from_html(`<div role="presentation"><!> <!></div>`);
var root_20 = from_html(`<button class="sheet-item svelte-13s71iz"><!> App-Info</button> <button class="sheet-item svelte-13s71iz"><!> App deinstallieren</button>`, 1);
var root_21 = from_html(`<div class="sheet-backdrop svelte-13s71iz" role="presentation"><div class="sheet svelte-13s71iz" role="dialog" tabindex="-1"><div class="sheet-title svelte-13s71iz"> </div> <button class="sheet-item svelte-13s71iz"><!> </button> <button class="sheet-item svelte-13s71iz"><!> In App-Liste ausblenden</button> <!></div></div>`);
var root_22 = from_html(`<button class="sheet-item svelte-13s71iz"><!> Widget entfernen</button>`);
var root_23 = from_html(`<div class="sheet-backdrop svelte-13s71iz" role="presentation"><div class="sheet svelte-13s71iz" role="dialog" tabindex="-1" aria-label="Home-Menü"><button class="sheet-item svelte-13s71iz"><!> Home-Bildschirm bearbeiten</button> <button class="sheet-item svelte-13s71iz"><!> Einstellungen</button> <!></div></div>`);
var root_24 = from_html(`<button class="edit-addwidget svelte-13s71iz"><!> Widget hinzufügen</button>`);
var root_25 = from_html(`<div class="edit-overlay svelte-13s71iz" role="presentation"><div class="edit-split svelte-13s71iz"><button class="edit-handle svelte-13s71iz" aria-label="Trennlinie Widgets/Favoriten verschieben"><span class="grip svelte-13s71iz"></span> <span class="edit-caption svelte-13s71iz">Widgets ↑ · Favoriten ↓</span></button></div> <div class="edit-railgrip svelte-13s71iz"><button class="edit-handle side svelte-13s71iz" aria-label="Swipe-Leiste verschieben"><span class="grip svelte-13s71iz"></span></button></div> <!> <button class="edit-done svelte-13s71iz">Fertig</button></div>`);
var root_26 = from_html(`<img class="wpick-icon svelte-13s71iz" alt=""/>`);
var root_27 = from_html(`<span class="wpick-icon fallback svelte-13s71iz"> </span>`);
var root_28 = from_html(`<img class="wpick-preview svelte-13s71iz" alt=""/>`);
var root_29 = from_html(`<div class="wpick-preview fallback svelte-13s71iz"></div>`);
var root_30 = from_html(`<button class="wpick-widget svelte-13s71iz"><!> <span class="wpick-wlabel svelte-13s71iz"> </span></button>`);
var root_31 = from_html(`<div class="wpick-widgets svelte-13s71iz"></div>`);
var root_32 = from_html(`<button class="wpick-app svelte-13s71iz"><!> <span class="wpick-appmeta svelte-13s71iz"><span class="wpick-appname svelte-13s71iz"> </span> <span class="wpick-count svelte-13s71iz"> </span></span></button> <!>`, 1);
var root_33 = from_html(`<div class="wpick-letter svelte-13s71iz"> </div> <!>`, 1);
var root_34 = from_html(`<div class="wpick svelte-13s71iz" role="dialog" aria-label="Widget auswählen"><div class="wpick-search svelte-13s71iz"><!> <input placeholder="Widget auswählen" class="svelte-13s71iz"/> <button class="wpick-close svelte-13s71iz" aria-label="Schließen"><!></button></div> <div class="wpick-list svelte-13s71iz"></div></div>`);
var root_35 = from_html(`<button> </button>`);
var root_36 = from_html(`<div class="aw-row svelte-13s71iz"><span class="aw-label svelte-13s71iz"> </span> <button class="aw-remove svelte-13s71iz" aria-label="Entfernen"><!></button></div>`);
var root_37 = from_html(`<div class="field svelte-13s71iz"><div class="row-name svelte-13s71iz">Android-Widgets</div> <!> <span class="row-sub svelte-13s71iz">Hinzufügen über <strong class="svelte-13s71iz">lange auf die Home drücken → Bearbeiten → Widget hinzufügen</strong>.</span></div>`);
var root_38 = from_html(`<div class="field svelte-13s71iz"><div class="row-name svelte-13s71iz">Widgets im Startbereich</div> <div class="chips svelte-13s71iz"></div></div> <!>`, 1);
var root_39 = from_html(`<button class="sheet-item svelte-13s71iz"><!> Orbit als Startbildschirm festlegen</button>`);
var root_40 = from_html(`<div class="settings-full svelte-13s71iz" role="dialog" aria-label="Einstellungen"><div class="settings-head svelte-13s71iz"><button class="settings-close svelte-13s71iz" aria-label="Schließen"><!></button> <div class="settings-title svelte-13s71iz">Einstellungen</div></div> <div class="settings-body svelte-13s71iz"><button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">Widgets anzeigen</span> <span class="row-sub svelte-13s71iz">Blendet den ganzen Widget-Bereich oben aus</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <!> <button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">Haptik beim Scrubben</span> <span class="row-sub svelte-13s71iz">Kurzes Vibrieren bei jedem neuen Buchstaben</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">App-Leiste immer sichtbar</span> <span class="row-sub svelte-13s71iz">Aus: nur einblenden, wenn du an den rechten Rand tippst</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Position der Liste</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0" max="0.6" step="0.01" class="svelte-13s71iz"/> <span class="row-sub svelte-13s71iz">Wie weit oben die gewählte Buchstaben-Gruppe landet</span></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Größe der Leiste</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0.4" max="1" step="0.02" class="svelte-13s71iz"/> <span class="row-sub svelte-13s71iz">Wie viel der rechten Seite die Buchstaben-Leiste einnimmt</span></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Abstand der Leiste vom rechten Rand</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0" max="60" step="2" class="svelte-13s71iz"/></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Bogen-Stärke (Welle)</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0" max="4" step="0.1" class="svelte-13s71iz"/> <span class="row-sub svelte-13s71iz">Wie weit sich die Buchstaben um den Finger nach links wölben</span></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Spreizung (hoch/runter)</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0" max="3" step="0.1" class="svelte-13s71iz"/> <span class="row-sub svelte-13s71iz">Wie weit die Buchstaben ober-/unterhalb des Fingers auseinandergehen</span></div> <button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">Buchstaben-Kreis anzeigen</span> <span class="row-sub svelte-13s71iz">Der runde Kreis links der Leiste beim Scrubben</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Größe des Kreises</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="36" max="110" step="2" class="svelte-13s71iz"/></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Abstand des Kreises vom rechten Rand</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="40" max="320" step="4" class="svelte-13s71iz"/></div> <button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">App-Symbole anzeigen</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <button class="row svelte-13s71iz"><span class="row-text svelte-13s71iz"><span class="row-name svelte-13s71iz">App-Namen anzeigen</span></span> <span><span class="knob svelte-13s71iz"></span></span></button> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Symbolgröße</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="24" max="72" step="2" class="svelte-13s71iz"/></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Schriftgröße (App-Namen)</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0.6" max="2.2" step="0.05" class="svelte-13s71iz"/></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Schriftgröße (Leiste)</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0.5" max="2.5" step="0.05" class="svelte-13s71iz"/></div> <div class="field svelte-13s71iz"><div class="row-name svelte-13s71iz">Schriftart</div> <div class="chips svelte-13s71iz"></div></div> <div class="field svelte-13s71iz"><div class="row-name svelte-13s71iz">Farben</div> <!> <span class="row-sub svelte-13s71iz">Auto = global übernehmen · Fest = eigene Farbe<!></span></div> <div class="slider svelte-13s71iz"><div class="slider-head svelte-13s71iz"><span class="row-name svelte-13s71iz">Abstand vom linken Rand</span> <span class="slider-val svelte-13s71iz"> </span></div> <input type="range" min="0" max="80" step="2" class="svelte-13s71iz"/></div> <!> <button class="sheet-item svelte-13s71iz"><!> </button> <button class="sheet-item svelte-13s71iz"><!> Orbit-App öffnen (Menü, Plugins, Themes)</button></div></div>`);
var root_41 = from_html(`<div class="setup svelte-13s71iz" role="dialog" aria-label="Als Standard-Launcher festlegen"><div class="aurora a1 svelte-13s71iz"></div> <div class="aurora a2 svelte-13s71iz"></div> <button class="setup-x svelte-13s71iz" aria-label="Schließen"><!></button> <div class="setup-stage svelte-13s71iz"><svg class="setup-illu svelte-13s71iz" viewBox="0 0 260 210" aria-hidden="true"><defs class="svelte-13s71iz"><linearGradient id="orbGrad" x1="0" y1="0" x2="1" y2="1" class="svelte-13s71iz"><stop offset="0" stop-color="var(--accent)" class="svelte-13s71iz"></stop><stop offset="1" stop-color="color-mix(in srgb, var(--accent) 55%, #b06cf0)" class="svelte-13s71iz"></stop></linearGradient></defs><ellipse class="ring svelte-13s71iz" cx="130" cy="105" rx="86" ry="40" fill="none" stroke="color-mix(in srgb, var(--accent) 60%, transparent)" stroke-width="3"></ellipse><circle class="planet svelte-13s71iz" cx="130" cy="105" r="34" fill="url(#orbGrad)"></circle><path d="M118 108l12-11 12 11 M121 105v12h18v-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="svelte-13s71iz"></path><circle class="moon svelte-13s71iz" cx="216" cy="105" r="6" fill="var(--accent)"></circle></svg> <div class="setup-kicker svelte-13s71iz">Orbit Launcher</div> <h1 class="setup-h1 svelte-13s71iz">Orbit als Startbildschirm</h1> <p class="setup-p svelte-13s71iz">Lege Orbit als deinen Standard-Launcher fest, damit die Home-Taste direkt hierher führt.</p> <button class="setup-go svelte-13s71iz">Als Standard-Launcher festlegen</button></div></div>`);
var root_42 = from_html(`<div class="launcher svelte-13s71iz"><div><!> <!></div> <!></div> <!> <!> <!> <!> <!> <!>`, 1);

const $$css = {
	hash: 'svelte-13s71iz',
	code: '\n  /* Transparent so the global wallpaper layer shows through (wallpaper-forward). */.launcher.svelte-13s71iz {position:relative;height:100%;overflow:hidden;}.list.svelte-13s71iz {position:relative; /* offset parent for section.offsetTop (anchor scroll) */height:100%;overflow-y:auto;padding:calc(env(safe-area-inset-top) + 40px) 52px calc(env(safe-area-inset-bottom) + 24px)\n      var(--list-pad, 20px);-webkit-overflow-scrolling:touch;}.clock.svelte-13s71iz {color:var(--text);text-shadow:0 2px 18px rgba(0, 0, 0, 0.4);margin-bottom:26px;font-family:var(--app-font, inherit);}\n  /* On the ★-home the widget area fills the space above the divider and its\n     content sits at the bottom (just above the line); favourites follow below. */.clock.home-region.svelte-13s71iz {display:flex;flex-direction:column;justify-content:flex-end;margin-bottom:10px;box-sizing:border-box;}.time.svelte-13s71iz {font-size:clamp(3.2rem, 16vw, 5rem);font-weight:300;letter-spacing:-0.03em;line-height:1;}.date.svelte-13s71iz {margin-top:6px;font-size:1.05rem;font-weight:500;opacity:0.9;text-transform:capitalize;}.batt.svelte-13s71iz {margin-top:10px;font-size:0.95rem;font-weight:600;opacity:0.85;}\n  /* Reserved space for a hosted Android widget; the native view draws on top. */.aw-slot.svelte-13s71iz {width:100%;margin-top:12px;border-radius:16px;\n    /* No placeholder fill: a loaded widget draws its own content on top; a\n       broken/empty slot stays invisible instead of an ugly dark box. */background:transparent;}\n  /* A widget that failed to render: subtle dashed hint, removable by long-press. */.aw-slot.broken.svelte-13s71iz {display:flex;align-items:center;justify-content:center;min-height:64px;border:1px dashed color-mix(in srgb, var(--fg) 30%, transparent);background:color-mix(in srgb, var(--bg-elevated) 18%, transparent);}.aw-broken-hint.svelte-13s71iz {display:inline-flex;align-items:center;gap:6px;font-size:12px;opacity:0.7;text-align:center;padding:0 10px;}.aw-row.svelte-13s71iz {display:flex;align-items:center;justify-content:space-between;padding:8px 0;}.aw-label.svelte-13s71iz {color:var(--text);font-size:1rem;}.aw-remove.svelte-13s71iz {background:none;border:none;color:var(--text-muted, color-mix(in srgb, var(--text) 55%, transparent));cursor:pointer;}.group.svelte-13s71iz {margin-bottom:14px;}.group-label.svelte-13s71iz {font-size:0.78rem;font-weight:700;letter-spacing:0.08em;color:var(--text);opacity:0.9;text-shadow:0 1px 8px rgba(0, 0, 0, 0.4);padding:4px 10px;}.app.svelte-13s71iz {width:100%;display:flex;align-items:center;gap:14px;padding:7px 10px;background:none;border:none;border-radius:14px;color:var(--text);text-shadow:0 1px 10px rgba(0, 0, 0, 0.35);cursor:pointer;transition:background 0.14s ease, transform 0.1s ease;touch-action:pan-y;}.app.svelte-13s71iz:active {transform:scale(0.98);background:color-mix(in srgb, var(--bg-elevated) 50%, transparent);}.app-icon.svelte-13s71iz {width:var(--app-icon, 42px);height:var(--app-icon, 42px);border-radius:12px;object-fit:cover;flex:none;}.app-icon.fallback.svelte-13s71iz {display:grid;place-items:center;background:color-mix(in srgb, var(--accent) 35%, var(--bg-elevated));font-weight:700;font-size:calc(var(--app-icon, 42px) * 0.42);}.app-label.svelte-13s71iz {font-size:calc(1.08rem * var(--app-label-scale, 1));font-weight:500;font-family:var(--app-font, inherit);}\n\n  /* While scrubbing, show only the active letter block (SKWD-Wall style); the\n     rest fades back in on release. */.clock.svelte-13s71iz,\n  .foot.svelte-13s71iz,\n  .group.svelte-13s71iz {transition:opacity 0.18s ease;}.list.focusing.svelte-13s71iz .clock:where(.svelte-13s71iz),\n  .list.focusing.svelte-13s71iz .foot:where(.svelte-13s71iz),\n  .list.focusing.svelte-13s71iz .group:where(.svelte-13s71iz):not(.active) {opacity:0;pointer-events:none;}.hint.svelte-13s71iz {color:var(--text);opacity:0.85;font-size:0.98rem;line-height:1.5;text-shadow:0 1px 10px rgba(0, 0, 0, 0.35);max-width:28rem;padding:20px 10px;}.foot.svelte-13s71iz {margin-top:10px;padding-top:14px;border-top:1px solid color-mix(in srgb, var(--text) 14%, transparent);display:flex;flex-direction:column;align-items:flex-start;gap:2px;}.foot-item.svelte-13s71iz {display:inline-flex;align-items:center;gap:12px;padding:12px 10px;background:none;border:none;color:var(--text);opacity:0.9;font-size:1.02rem;text-shadow:0 1px 10px rgba(0, 0, 0, 0.35);cursor:pointer;}\n\n  /* ---- Wave scrubber ---- */.scrubber.svelte-13s71iz {position:absolute;top:50%;transform:translateY(-50%); /* vertically centred band; height set inline */right:0;width:34px;display:flex;flex-direction:column;align-items:stretch;padding-right:8px;touch-action:none;z-index:5;transition:opacity 0.2s ease;}.scrubber.hidden.svelte-13s71iz {opacity:0; /* still hittable at the edge → tapping the edge reveals it */}\n  /* Equal slots so a letter\'s visual centre matches (i+0.5)·rowH in the wave math. */.scrub-key.svelte-13s71iz {flex:1 1 0;display:flex;align-items:center;justify-content:flex-end;font-size:calc(0.8rem * var(--rail-label-scale, 1));font-weight:700;font-family:var(--app-font, inherit);color:var(--text);opacity:1;text-shadow:0 1px 8px rgba(0, 0, 0, 0.5);transform-origin:right center;will-change:transform;pointer-events:none;line-height:1;}.scrub-key.active.svelte-13s71iz {color:var(--accent);}.bubble.svelte-13s71iz {position:absolute;right:46px;transform:translateY(-50%);width:58px;height:58px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:#fff;font-size:1.6rem;font-weight:700;box-shadow:0 8px 26px rgba(0, 0, 0, 0.35);pointer-events:none;z-index:6;\n    /* Snap to each letter\'s centre — the "einrasten" detent feel. */transition:top 0.07s ease-out;}\n\n  /* ---- Fullscreen settings page ---- */.settings-full.svelte-13s71iz {position:fixed;inset:0;z-index:100;background:var(--bg);display:flex;flex-direction:column;}.settings-head.svelte-13s71iz {display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px;border-bottom:1px solid var(--border);}.settings-close.svelte-13s71iz {flex:none;width:44px;height:44px;display:grid;place-items:center;border:none;background:none;color:var(--text);border-radius:12px;cursor:pointer;}.settings-close.svelte-13s71iz:active {background:var(--bg-elevated);}.settings-title.svelte-13s71iz {font-size:1.3rem;font-weight:700;color:var(--text);}.settings-body.svelte-13s71iz {flex:1;overflow-y:auto;padding:8px 10px calc(env(safe-area-inset-bottom) + 24px);}\n\n  /* ---- Sheets ---- */.sheet-backdrop.svelte-13s71iz {position:fixed;inset:0;z-index:95;background:rgba(0, 0, 0, 0.45);display:flex;align-items:flex-end;}.sheet.svelte-13s71iz {width:100%;background:var(--bg-elevated);border-radius:20px 20px 0 0;padding:14px 10px calc(env(safe-area-inset-bottom) + 14px);box-shadow:0 -12px 40px rgba(0, 0, 0, 0.3);}.sheet-title.svelte-13s71iz {font-size:1.1rem;font-weight:700;color:var(--text);padding:6px 12px 12px;}.sheet-item.svelte-13s71iz {width:100%;display:flex;align-items:center;gap:14px;padding:14px 12px;background:none;border:none;border-radius:12px;color:var(--text);font-size:1.02rem;text-align:left;cursor:pointer;}.sheet-item.svelte-13s71iz:active {background:var(--bg);}.row.svelte-13s71iz {width:100%;display:flex;align-items:center;gap:14px;padding:12px;background:none;border:none;color:var(--text);text-align:left;cursor:pointer;}.row-text.svelte-13s71iz {flex:1;display:flex;flex-direction:column;gap:2px;}.row-name.svelte-13s71iz {font-size:1.02rem;}.row-sub.svelte-13s71iz {font-size:0.85rem;color:var(--text-muted, color-mix(in srgb, var(--text) 55%, transparent));}.switch.svelte-13s71iz {flex:none;width:46px;height:28px;border-radius:999px;background:color-mix(in srgb, var(--text) 25%, transparent);position:relative;transition:background 0.15s ease;}.switch.on.svelte-13s71iz {background:var(--accent);}.knob.svelte-13s71iz {position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform 0.15s ease;}.switch.on.svelte-13s71iz .knob:where(.svelte-13s71iz) {transform:translateX(18px);}.slider.svelte-13s71iz {display:flex;flex-direction:column;gap:6px;padding:12px;}.slider-head.svelte-13s71iz {display:flex;justify-content:space-between;align-items:baseline;}.slider-val.svelte-13s71iz {font-size:0.85rem;font-weight:700;color:var(--accent);}.slider.svelte-13s71iz input[type=\'range\']:where(.svelte-13s71iz) {width:100%;accent-color:var(--accent);}.field.svelte-13s71iz {display:flex;flex-direction:column;gap:10px;padding:12px;}.chips.svelte-13s71iz {display:flex;flex-wrap:wrap;gap:8px;}.chip.svelte-13s71iz {padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:0.95rem;cursor:pointer;}.chip.on.svelte-13s71iz {background:var(--accent);color:#fff;border-color:var(--accent);}\n\n  /* ---- Home edit mode ---- */.edit-overlay.svelte-13s71iz {position:fixed;inset:0;z-index:110;background:rgba(0, 0, 0, 0.35);touch-action:none;}.edit-split.svelte-13s71iz {position:absolute;left:0;right:0;transform:translateY(-50%);display:flex;justify-content:center;}.edit-split.svelte-13s71iz::before {content:\'\';position:absolute;left:16px;right:16px;top:50%;height:2px;background:var(--accent);opacity:0.85;}.edit-railgrip.svelte-13s71iz {position:absolute;right:0;}.edit-handle.svelte-13s71iz {position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:999px;background:var(--accent);color:#fff;box-shadow:0 6px 20px rgba(0, 0, 0, 0.4);cursor:grab;touch-action:none;}.edit-handle.side.svelte-13s71iz {padding:12px 10px;border-radius:12px;margin-right:6px;}.grip.svelte-13s71iz {width:28px;height:4px;border-radius:2px;background:rgba(255, 255, 255, 0.9);}.edit-handle.side.svelte-13s71iz .grip:where(.svelte-13s71iz) {width:18px;}.edit-caption.svelte-13s71iz {font-size:0.8rem;font-weight:700;white-space:nowrap;}.edit-done.svelte-13s71iz {position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 24px);transform:translateX(-50%);padding:12px 32px;border-radius:999px;border:none;background:var(--accent);color:#fff;font-weight:700;font-size:1rem;box-shadow:0 8px 24px rgba(0, 0, 0, 0.3);cursor:pointer;}.edit-addwidget.svelte-13s71iz {position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 84px);transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:999px;border:1px solid color-mix(in srgb, var(--text) 25%, transparent);background:color-mix(in srgb, var(--bg-elevated) 70%, transparent);color:var(--text);font-weight:700;font-size:0.95rem;backdrop-filter:blur(8px);cursor:pointer;white-space:nowrap;}\n\n  /* ---- Widget picker (Niagara-style: A–Z app list + expandable previews) ---- */.wpick.svelte-13s71iz {position:fixed;inset:0;z-index:100;background:color-mix(in srgb, var(--bg) 82%, transparent);backdrop-filter:blur(10px);display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 14px) 14px calc(env(safe-area-inset-bottom) + 14px);}.wpick-search.svelte-13s71iz {display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:999px;background:var(--bg-elevated);color:var(--text);margin-bottom:12px;flex:none;}.wpick-search.svelte-13s71iz input:where(.svelte-13s71iz) {flex:1;border:none;background:none;color:var(--text);font-size:1.1rem;outline:none;}.wpick-close.svelte-13s71iz {flex:none;width:34px;height:34px;display:grid;place-items:center;border:none;background:none;color:var(--text);cursor:pointer;}.wpick-list.svelte-13s71iz {flex:1;overflow-y:auto;}.wpick-letter.svelte-13s71iz {font-size:0.9rem;font-weight:700;color:var(--text);opacity:0.6;padding:10px 6px 4px;}.wpick-app.svelte-13s71iz {width:100%;display:flex;align-items:center;gap:16px;padding:10px 6px;background:none;border:none;color:var(--text);cursor:pointer;text-align:left;}.wpick-icon.svelte-13s71iz {width:46px;height:46px;border-radius:12px;object-fit:cover;flex:none;}.wpick-icon.fallback.svelte-13s71iz {display:grid;place-items:center;background:color-mix(in srgb, var(--accent) 35%, var(--bg-elevated));font-weight:700;font-size:1.2rem;}.wpick-appmeta.svelte-13s71iz {display:flex;flex-direction:column;}.wpick-appname.svelte-13s71iz {font-size:1.15rem;font-weight:600;}.wpick-count.svelte-13s71iz {font-size:0.9rem;opacity:0.6;}.wpick-widgets.svelte-13s71iz {display:flex;flex-direction:column;gap:12px;padding:6px 6px 14px 72px;}.wpick-widget.svelte-13s71iz {display:flex;flex-direction:column;gap:8px;padding:10px;border:none;border-radius:16px;background:var(--bg-elevated);color:var(--text);cursor:pointer;text-align:left;}.wpick-preview.svelte-13s71iz {width:100%;max-height:220px;object-fit:contain;border-radius:12px;}.wpick-preview.fallback.svelte-13s71iz {height:120px;background:var(--bg);}.wpick-wlabel.svelte-13s71iz {font-size:1rem;font-weight:500;}\n\n  /* ---- Set-as-default-launcher prompt (setup-dialog standard) ---- */.setup.svelte-13s71iz {position:fixed;inset:0;z-index:950;background:radial-gradient(\n        circle at 50% 28%,\n        color-mix(in srgb, var(--accent) 22%, transparent),\n        transparent 70%\n      ),\n      var(--bg);display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 40px) 24px calc(env(safe-area-inset-bottom) + 32px);overflow:hidden;}.aurora.svelte-13s71iz {position:absolute;border-radius:50%;filter:blur(60px);opacity:0.45;pointer-events:none;}.a1.svelte-13s71iz {width:320px;height:320px;background:var(--accent);top:-60px;left:-40px;\n    animation: svelte-13s71iz-drift1 14s ease-in-out infinite;}.a2.svelte-13s71iz {width:280px;height:280px;background:color-mix(in srgb, var(--accent) 50%, #b06cf0);bottom:-60px;right:-40px;\n    animation: svelte-13s71iz-drift2 16s ease-in-out infinite;}\n  @keyframes svelte-13s71iz-drift1 {\n    0%,\n    100% {\n      transform: translate(0, 0);\n    }\n    50% {\n      transform: translate(30px, 40px);\n    }\n  }\n  @keyframes svelte-13s71iz-drift2 {\n    0%,\n    100% {\n      transform: translate(0, 0);\n    }\n    50% {\n      transform: translate(-30px, -30px);\n    }\n  }.setup-x.svelte-13s71iz {position:absolute;top:calc(env(safe-area-inset-top) + 12px);right:16px;width:44px;height:44px;display:grid;place-items:center;border:none;background:color-mix(in srgb, var(--bg-elevated) 60%, transparent);color:var(--text);border-radius:50%;cursor:pointer;z-index:2;}.setup-stage.svelte-13s71iz {position:relative;max-width:440px;text-align:center;z-index:1;}.setup-illu.svelte-13s71iz {width:220px;height:auto;margin:0 auto 20px;display:block;}.setup-illu.svelte-13s71iz .planet:where(.svelte-13s71iz) {\n    animation: svelte-13s71iz-pop 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);transform-origin:center;}.setup-illu.svelte-13s71iz .ring:where(.svelte-13s71iz) {\n    animation: svelte-13s71iz-spin 18s linear infinite;transform-origin:130px 105px;}.setup-illu.svelte-13s71iz .moon:where(.svelte-13s71iz) {\n    animation: svelte-13s71iz-spin 6s linear infinite;transform-origin:130px 105px;}\n  @keyframes svelte-13s71iz-pop {\n    from {\n      transform: scale(0);\n    }\n    to {\n      transform: scale(1);\n    }\n  }\n  @keyframes svelte-13s71iz-spin {\n    to {\n      transform: rotate(360deg);\n    }\n  }.setup-kicker.svelte-13s71iz {text-transform:uppercase;letter-spacing:0.08em;font-size:0.8rem;font-weight:700;color:var(--accent);margin-bottom:8px;}.setup-h1.svelte-13s71iz {font-size:clamp(1.6rem, 7vw, 2.2rem);font-weight:800;letter-spacing:-0.02em;color:var(--text);margin:0 0 12px;}.setup-p.svelte-13s71iz {color:var(--text-muted, color-mix(in srgb, var(--text) 65%, transparent));font-size:1.02rem;line-height:1.6;margin:0 auto 28px;max-width:32rem;}.setup-go.svelte-13s71iz {width:100%;max-width:360px;padding:15px;border-radius:16px;border:none;background:linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #b06cf0));color:#fff;font-size:1.05rem;font-weight:700;cursor:pointer;box-shadow:0 10px 28px rgba(0, 0, 0, 0.3);}\n\n  @media (prefers-reduced-motion: reduce) {.app.svelte-13s71iz,\n    .scrubber.svelte-13s71iz,\n    .switch.svelte-13s71iz,\n    .knob.svelte-13s71iz,\n    .group.svelte-13s71iz,\n    .clock.svelte-13s71iz,\n    .foot.svelte-13s71iz {transition:none;}.aurora.svelte-13s71iz,\n    .setup-illu.svelte-13s71iz .planet:where(.svelte-13s71iz),\n    .setup-illu.svelte-13s71iz .ring:where(.svelte-13s71iz),\n    .setup-illu.svelte-13s71iz .moon:where(.svelte-13s71iz) {\n      animation: none;}\n  }'
};

function Home($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css);

	let manager = prop($$props, 'manager', 7);
	const hasLauncher = manager().hasLauncher;
	const haptics = $$props.app.capabilities.get('haptics'); // crisp system tick (native)

	// Clock — the quiet centrepiece, floating over the wallpaper.
	let now = state(proxy(new Date()));

	const timeStr = user_derived(() => get(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
	const dateStr = user_derived(() => get(now).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }));
	let sections = state(proxy([]));
	let icons = state(proxy({}));
	let listEl;
	let sectionEls = {};

	// Scrubber (wave) state. The wave math (Gaussian swell, rise/fall, hysteresis)
	// is adapted from Cascade Launcher's AlphabetWave.kt (MIT), ported to the DOM.
	let scrubEl;

	let scrubbing = state(false);
	let scrubY = state(-999 // px within the scrubber
	);
	let scrubH = state(1);
	let activeIndex = state(-1);
	let waveAmp = state(0 // 0 at rest → 1 while scrubbing (eased rise/fall)
	);
	let waveRaf = 0;

	// ★-home: at rest only widgets + favourites show; swiping reveals all apps.
	let appsRevealed = state(false);

	// Home edit mode: long-press → drag the rail position and the widgets/favourites divider.
	let editMenuOpen = state(false);

	let editing = state(false);
	let dragging = state(null);
	let railPos = state(proxy(manager().railPos() // vertical centre of the rail (0…1)
	));
	let homeSplit = state(proxy(manager().homeSplit() // where favourites start (0…1)
	));
	let bubbleVisible = state(proxy(manager().bubbleVisible()));
	let bubbleSize = state(proxy(manager().bubbleSize() // letter bubble diameter (px)
	));
	let bubbleRight = state(proxy(manager().bubbleRight() // bubble distance from right edge (px)
	));

	// The bubble snaps to the active letter's centre (a detent feel) rather than
	// trailing the finger continuously.
	const bubbleTop = user_derived(() => get(scrubbing) && get(activeIndex) >= 0 && get(sections).length > 0
		? (get(activeIndex) + 0.5) * get(scrubH) / get(sections).length
		: get(scrubY));

	let railRight = state(proxy(manager().railRight() // rail distance from the right edge (px)
	));
	let fontFamily = state(proxy(manager().fontFamily() // app names + rail letters font
	));

	// Home widget area.
	let widgets = state(proxy(manager().widgets()));

	let battery = state(null);
	const batteryStr = user_derived(() => get(battery) != null ? `${get(battery)} %` : '—');

	const AVAILABLE_WIDGETS = [
		{ id: 'clock', label: 'Uhr' },
		{ id: 'date', label: 'Datum' },
		{ id: 'battery', label: 'Akku' }
	];

	function toggleWidget(id) {
		manager().toggleWidget(id);
		set(widgets, manager().widgets(), true);
	}

	// Real Android app widgets (hosted natively over the launcher).
	const appwidgets = $$props.app.capabilities.get('appwidgets');

	let appWidgets = state(proxy([]));
	let widgetMenuId = state(null);

	/** Widget ids whose RemoteViews failed to render (show a removable placeholder). */
	let brokenWidgets = state(proxy([]));

	async function loadAppWidgets() {
		if (appwidgets) set(appWidgets, await appwidgets.list(), true);
	}

	// Custom widget picker (Niagara-style: A–Z app list, tap an app to expand its
	// widget previews, search on top) instead of the ugly system list.
	let widgetPickerOpen = state(false);

	let providers = state(proxy([]));
	let widgetSearch = state('');
	let expandedApp = state(null);
	let widgetAppIcons = state(proxy({}));

	function awLetter(s) {
		const raw = (s.trim()[0] ?? '#').toUpperCase();
		const c = ({ Ä: 'A', Ö: 'O', Ü: 'U' })[raw] ?? raw;

		return (/[A-Z]/).test(c) ? c : '#';
	}

	// Providers grouped by app, A–Z sectioned, filtered by the search.
	const widgetApps = user_derived(() => {
		const q = get(widgetSearch).trim().toLowerCase();
		const byPkg = new Map();

		for (const p of get(providers)) {
			if (q && !p.appLabel.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) continue;

			let g = byPkg.get(p.pkg);

			if (!g) {
				g = { pkg: p.pkg, appLabel: p.appLabel, widgets: [] };
				byPkg.set(p.pkg, g);
			}

			g.widgets.push(p);
		}

		const apps = [...byPkg.values()].sort((a, b) => a.appLabel.localeCompare(b.appLabel));
		const sections = [];

		for (const a of apps) {
			const k = awLetter(a.appLabel);
			let s = sections[sections.length - 1];

			if (!s || s.key !== k) {
				s = { key: k, apps: [] };
				sections.push(s);
			}

			s.apps.push(a);
		}

		return sections;
	});

	async function openWidgetPicker() {
		if (!appwidgets) return;

		set(providers, await appwidgets.listProviders(), true);
		set(expandedApp, null);
		set(widgetSearch, '');
		set(widgetPickerOpen, true);

		// Load app icons (cached by the launcher manager).
		for (const pkg of new Set(get(providers).map((p) => p.pkg))) {
			if (get(widgetAppIcons)[pkg]) continue;

			const url = await manager().iconUrl(pkg);

			if (url) set(widgetAppIcons, { ...get(widgetAppIcons), [pkg]: url }, true);
		}
	}

	async function chooseProvider(pkg, cls) {
		if (!appwidgets) return;

		set(widgetPickerOpen, false);

		const w = await appwidgets.add(pkg, cls);

		if (w) {
			set(appWidgets, await appwidgets.list(), true);
			await placeAppWidgets();
		}
	}

	async function removeAppWidget(id) {
		if (!appwidgets) return;

		await appwidgets.remove(id);
		set(brokenWidgets, get(brokenWidgets).filter((x) => x !== id), true);
		set(appWidgets, await appwidgets.list(), true);
	}

	/** Position each hosted widget's native view over its reserved web slot. */
	async function placeAppWidgets() {
		if (!appwidgets || get(appWidgets).length === 0) return;

		await tick();

		const dpr = window.devicePixelRatio || 1;

		for (const w of get(appWidgets)) {
			const el = document.querySelector(`[data-aw="${w.widgetId}"]`);

			if (!el) continue;

			const r = el.getBoundingClientRect();

			if (r.width < 2 || r.height < 2) continue;

			void appwidgets.place(w.widgetId, r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr);
		}
	}

	// Launcher-local colour overrides (Auto = inherit global, Fest, or SKWD palette).
	let colors = state(proxy(manager().colors()));

	let palette = state(proxy($$props.app.theme.palette.get()));
	const colorRoles = DESIGN_COLORS.map((c) => ({ key: c.key, label: c.label }));
	const skwdAvailable = $$props.app.plugins.getAll().some((p) => p.manifest.id === 'skwd-wall');

	// Build the CSS var overrides applied on .launcher; 'skwd' resolves live.
	const colorVars = user_derived(() => Object.entries(get(colors)).map(([k, v]) => {
		if (v === 'skwd') {
			const role = DESIGN_COLORS.find((c) => c.key === k)?.role;

			return role ? `--${k}: ${get(palette)[role]};` : '';
		}

		return `--${k}: ${v};`;
	}).join(' '));

	function setColor(key, value) {
		manager().setColor(key, value);
		set(colors, { ...manager().colors() }, true);
	}

	// Android ships these system families; they fall back to generics on web/desktop.
	const FONTS = [
		{ label: 'Auto', value: '' },
		{ label: 'Schmal', value: '"sans-serif-condensed", sans-serif' },
		{ label: 'Leicht', value: '"sans-serif-light", sans-serif' },
		{ label: 'Serif', value: 'serif' },
		{ label: 'Mono', value: 'monospace' },
		{ label: 'Locker', value: 'casual, cursive' },
		{ label: 'Hand', value: 'cursive' }
	];

	const WAVE_SIGMA = 70; // influence spread (px) — wider = smoother, bigger arc
	const WAVE_VSHIFT = 40; // base px letters push up/down away from the finger
	const LEAVE_MARGIN = 0.3; // slot fraction to move past before switching letter

	function animateWave(target) {
		cancelAnimationFrame(waveRaf);

		const step = () => {
			const d = target - get(waveAmp);

			if (Math.abs(d) < 0.01) {
				set(waveAmp, target, true);

				return;
			}

			set(waveAmp, get(waveAmp) + d * 0.3);
			waveRaf = requestAnimationFrame(step);
		};

		waveRaf = requestAnimationFrame(step);
	}

	// Rail visibility: always on screen (default) or edge-revealed.
	let railAlways = state(proxy(manager().railAlwaysVisible()));

	let revealed = state(false);
	let hideTimer;
	const railVisible = user_derived(() => get(railAlways) || get(revealed) || get(scrubbing));

	// Adjustable layout (all live-tunable in the launcher settings).
	let sectionAnchor = state(proxy(manager().sectionAnchor() // 0=top … where a jump lands
	));

	let railHeightFrac = state(proxy(manager().railHeight() // scrubber band height fraction
	));
	let waveStrength = state(proxy(manager().waveStrength() // horizontal arc multiplier
	));
	let verticalSpread = state(proxy(manager().verticalSpread() // vertical push multiplier
	));
	let iconSize = state(proxy(manager().iconSize() // app icon px
	));
	let labelScale = state(proxy(manager().labelScale() // app label font multiplier
	));
	let railLabelScale = state(proxy(manager().railLabelScale() // rail letter font multiplier
	));
	let showIcons = state(proxy(manager().showIcons()));
	let showLabels = state(proxy(manager().showLabels()));
	let leftPad = state(proxy(manager().leftPad() // list distance from the left edge (px)
	));
	let showWidgets = state(proxy(manager().showWidgets() // top widget area visible
	));
	let hapticsEnabled = state(proxy(manager().hapticsEnabled()));

	// Overlays.
	let menuApp = state(null);

	let settingsOpen = state(false);
	let isDefault = state(true);
	let showDefaultPrompt = state(false);

	// Whether this view runs in the HOME activity (launcher) or the Orbit app.
	let isHomeMode = state(true);

	// Show hosted widgets only on the plain home — hide them while the app list
	// is scrolled or ANY overlay is open (native views sit above the web, so they
	// must not float over the picker, settings, edit mode, etc.).
	const widgetsHidden = user_derived(() => get(appsRevealed) || get(settingsOpen) || get(editing) || get(widgetPickerOpen) || get(menuApp) !== null || get(widgetMenuId) !== null || get(editMenuOpen) || get(showDefaultPrompt));

	user_effect(() => {
		void get(appWidgets);

		if (!appwidgets) return;
		if (get(widgetsHidden)) void appwidgets.hideAll(); else void placeAppWidgets();
	});

	onMount(() => {
		// Let the gear (Plugins area) open these settings directly.
		manager().onOpenSettings = () => set(settingsOpen, true);

		if (manager().wantSettings) {
			set(settingsOpen, true);
			manager().wantSettings = false;
		}

		void reload();

		if (hasLauncher) void manager().isDefaultLauncher().then((d) => {
			set(isDefault, d, true);

			// Each time the launcher opens and Orbit isn't the default home, ask.
			if (!d) set(showDefaultPrompt, true);
		});

		void $$props.app.capabilities.get('launcher')?.launchMode().then((m) => {
			set(isHomeMode, m === 'home');

			// Only the real HOME activity has a transparent window → let the device
			// wallpaper show through. In the Orbit app (app mode) keep it opaque.
			document.documentElement.classList.toggle('home-wallpaper', m === 'home');
		});

		const t = setInterval(() => set(now, new Date(), true), 10_000);

		void loadAppWidgets();

		appwidgets?.onLongPress((id) => {
			set(widgetMenuId, id, true);
			set(editMenuOpen, true);
		});

		appwidgets?.onState((id, ok) => {
			const has = get(brokenWidgets).includes(id);

			if (!ok && !has) set(brokenWidgets, [...get(brokenWidgets), id], true); else if (ok && has) set(brokenWidgets, get(brokenWidgets).filter((x) => x !== id), true);
		});

		const onResize = () => void placeAppWidgets();

		window.addEventListener('resize', onResize);

		// Follow the wallpaper palette so 'SKWD'-bound colours update live.
		const unsubPalette = $$props.app.theme.palette.subscribe((p) => set(palette, p, true));

		// Battery widget (Battery Status API; silently absent where unsupported).
		const nav = navigator;

		if (nav.getBattery) {
			nav.getBattery().then((b) => {
				const upd = () => set(battery, Math.round(b.level * 100), true);

				upd();
				b.addEventListener('levelchange', upd);
			}).catch(() => {});
		}

		return () => {
			clearInterval(t);
			cancelAnimationFrame(waveRaf);
			unsubPalette();
			window.removeEventListener('resize', onResize);
			void appwidgets?.hideAll();
			manager().onOpenSettings = null;
			document.documentElement.classList.remove('home-wallpaper');
		};
	});

	async function reload() {
		set(sections, await manager().sections(), true);
		await tick();
		void loadAllIcons();
	}

	/** Load icons sequentially so we never flood the Capacitor bridge; rows show a
	 *  letter fallback until their icon arrives. */
	async function loadAllIcons() {
		for (const s of get(sections)) {
			for (const a of s.apps) {
				if (get(icons)[a.packageName]) continue;

				const url = await manager().iconUrl(a.packageName);

				if (url) set(icons, { ...get(icons), [a.packageName]: url }, true);
			}
		}
	}

	async function launch(pkg) {
		// Tapping Orbit → the Orbit app (mode-aware, see openOrbitApp).
		if (pkg === manager().selfPackage) {
			await openOrbitApp();

			return;
		}

		await manager().launch(pkg);
	}

	function scrollToSection(key) {
		// scroll-margin-top on each section (= anchor·viewport) makes scrollIntoView
		// land the section at the chosen position, not glued to the top.
		sectionEls[key]?.scrollIntoView({ block: 'start', behavior: 'auto' });
	}

	// ---- Scrubber wave -------------------------------------------------------
	function scrubFromEvent(e) {
		const r = scrubEl.getBoundingClientRect();

		set(scrubH, r.height, true);
		set(scrubY, e.clientY - r.top);

		const n = get(sections).length;

		if (n === 0) return;

		const rowH = r.height / n;
		const raw = get(scrubY // fractional slot position
		) / rowH;

		// Hysteresis: keep the current letter until the finger moves clearly out of
		// its slot (LEAVE_MARGIN), so the selection doesn't flicker on tiny moves.
		let idx;

		if (get(activeIndex) >= 0 && raw > get(activeIndex) - LEAVE_MARGIN && raw < get(activeIndex) + 1 + LEAVE_MARGIN) {
			idx = get(activeIndex);
		} else {
			idx = Math.max(0, Math.min(n - 1, Math.floor(raw)));
		}

		if (idx !== get(activeIndex)) {
			set(activeIndex, idx, true);
			scrollToSection(get(sections)[idx].key);

			// Crisp system CLOCK_TICK (picker-wheel tick), not a vibration buzz.
			if (get(hapticsEnabled)) void haptics?.tick();
		}
	}

	function onScrubDown(e) {
		set(scrubbing, true);
		set(revealed, true);
		set(appsRevealed, true // start of a swipe reveals the full app list
		);
		scrubEl.setPointerCapture?.(e.pointerId);
		animateWave(1);
		scrubFromEvent(e);
	}

	function onScrubMove(e) {
		if (get(scrubbing)) scrubFromEvent(e);
	}

	function onScrubUp() {
		// Releasing on ★ returns to the home (apps hidden again).
		if (get(sections)[get(activeIndex)]?.key === '★') set(appsRevealed, false);

		set(scrubbing, false);
		set(scrubY, -999);
		set(activeIndex, -1);
		animateWave(0);

		if (!get(railAlways)) {
			clearTimeout(hideTimer);
			hideTimer = setTimeout(() => set(revealed, false), 900);
		}
	}

	/** The arc: letters bow left toward the finger (Gaussian × eased amplitude).
	 *  No font scaling — just the bow, like Niagara. Adapted from Cascade (MIT). */
	function letterStyle(i) {
		if (get(waveAmp) < 0.01) return '';

		const n = get(sections).length;
		const rowH = get(scrubH) / n;
		const yi = (i + 0.5) * rowH;
		const d = yi - get(scrubY);
		const g = Math.exp(-(d * d) / (2 * WAVE_SIGMA * WAVE_SIGMA)) * get(waveAmp);
		const tx = -70 * get(waveStrength) * g;

		// Vertical spread: letters above the finger push up, below push down (they
		// fan out around the finger). sign(d): d<0 above → up, d>0 below → down.
		const ty = Math.sign(d) * WAVE_VSHIFT * get(verticalSpread) * g;

		return `transform: translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px);`;
	}

	// ---- Long-press menu + favourites/hide -----------------------------------
	function longpress(node, onLong) {
		let timer;
		let sx = 0;
		let sy = 0;
		let fired = false;

		const down = (e) => {
			fired = false;
			sx = e.clientX;
			sy = e.clientY;

			timer = setTimeout(
				() => {
					fired = true;
					onLong();
				},
				480
			);
		};

		const move = (e) => {
			if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) {
				clearTimeout(timer);
				timer = undefined;
			}
		};

		const cancel = () => {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
		};

		const click = (e) => {
			if (fired) {
				e.stopPropagation();
				e.preventDefault();
				fired = false;
			}
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', cancel);
		node.addEventListener('pointercancel', cancel);
		node.addEventListener('click', click, true);

		return {
			destroy() {
				node.removeEventListener('pointerdown', down);
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerup', cancel);
				node.removeEventListener('pointercancel', cancel);
				node.removeEventListener('click', click, true);
			}
		};
	}

	function toggleFavorite(pkg) {
		manager().toggleFavorite(pkg);
		set(menuApp, null);
		void reload();
	}

	function appInfoApp(pkg) {
		void manager().appInfo(pkg);
		set(menuApp, null);
	}

	function uninstallApp(pkg) {
		void manager().uninstall(pkg);
		set(menuApp, null);
	}

	function hideApp(pkg) {
		manager().toggleHidden(pkg);
		set(menuApp, null);
		void reload();
	}

	function setRailAlways(on) {
		set(railAlways, on, true);
		manager().setRailAlwaysVisible(on);
	}

	function setAnchor(v) {
		set(sectionAnchor, v, true);
		manager().setSectionAnchor(v);
	}

	function setRailHeight(v) {
		set(railHeightFrac, v, true);
		manager().setRailHeight(v);
	}

	function setWave(v) {
		set(waveStrength, v, true);
		manager().setWaveStrength(v);
	}

	function setVerticalSpread(v) {
		set(verticalSpread, v, true);
		manager().setVerticalSpread(v);
	}

	function setIconSize(v) {
		set(iconSize, v, true);
		manager().setIconSize(v);
	}

	function setLabelScale(v) {
		set(labelScale, v, true);
		manager().setLabelScale(v);
	}

	function setRailLabelScale(v) {
		set(railLabelScale, v, true);
		manager().setRailLabelScale(v);
	}

	function setShowIcons(on) {
		set(showIcons, on, true);
		manager().setShowIcons(on);
	}

	function setShowLabels(on) {
		set(showLabels, on, true);
		manager().setShowLabels(on);
	}

	function setLeftPad(v) {
		set(leftPad, v, true);
		manager().setLeftPad(v);
	}

	function setShowWidgets(on) {
		set(showWidgets, on, true);
		manager().setShowWidgets(on);
	}

	function setHaptics(on) {
		set(hapticsEnabled, on, true);
		manager().setHapticsEnabled(on);
	}

	function setBubbleVisible(on) {
		set(bubbleVisible, on, true);
		manager().setBubbleVisible(on);
	}

	function setBubbleSize(v) {
		set(bubbleSize, v, true);
		manager().setBubbleSize(v);
	}

	function setBubbleRight(v) {
		set(bubbleRight, v, true);
		manager().setBubbleRight(v);
	}

	function setRailRight(v) {
		set(railRight, v, true);
		manager().setRailRight(v);
	}

	function setFont(v) {
		set(fontFamily, v, true);
		manager().setFontFamily(v);
	}

	// ---- Home edit mode (drag rail position + widgets/favourites divider) ----
	/** Long-press on empty home area (not an app) opens the edit menu. */
	function homeLongpress(node) {
		let timer;
		let sx = 0;
		let sy = 0;

		const down = (e) => {
			if (e.target?.closest('.app, button, input, a')) return;

			sx = e.clientX;
			sy = e.clientY;
			timer = setTimeout(() => set(editMenuOpen, true), 550);
		};

		const move = (e) => {
			if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) {
				clearTimeout(timer);
				timer = undefined;
			}
		};

		const cancel = () => {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', cancel);
		node.addEventListener('pointercancel', cancel);

		return {
			destroy() {
				node.removeEventListener('pointerdown', down);
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerup', cancel);
				node.removeEventListener('pointercancel', cancel);
			}
		};
	}

	function startDrag(e, which) {
		e.preventDefault();
		e.stopPropagation();
		set(dragging, which, true);
	}

	function onDragMove(e) {
		if (!get(dragging)) return;

		const frac = Math.max(0.05, Math.min(0.95, e.clientY / window.innerHeight));

		if (get(dragging) === 'rail') {
			set(railPos, frac, true);
			manager().setRailPos(frac);
		} else {
			set(homeSplit, frac, true);
			manager().setHomeSplit(frac);
		}
	}

	function onDragEnd() {
		set(dragging, null);
	}

	/** Send the current appearance (launcher + global design) to the dev server so
	 *  it can be baked in as the code default. Clipboard is blocked in the http
	 *  webview, so POST is the reliable path; clipboard is only a fallback. */
	let copied = state(false);

	async function copyAppearance() {
		const design = $$props.app.getDesign?.() ?? {};
		const payload = JSON.stringify({ launcher: manager().appearanceSnapshot(), design }, null, 2);
		let ok = false;

		try {
			const r = await fetch('/__appearance', { method: 'POST', body: payload });

			ok = r.ok;
		} catch {
			/* dev server unreachable → try clipboard */
		}

		if (!ok) {
			try {
				await navigator.clipboard.writeText(payload);
				ok = true;
			} catch {
				console.info('[orbit-launcher] appearance:', payload);
			}
		}

		set(copied, ok, true);
		setTimeout(() => set(copied, false), 1800);
	}

	async function makeDefault() {
		await manager().openDefaultLauncherSettings();
	}

	async function openOrbitApp() {
		set(settingsOpen, false);

		// From the HOME launcher → start the Orbit app as its own swipeable task.
		// From WITHIN the Orbit app (launcher opened in-app) → just navigate to the
		// shell home, so you're not trapped relaunching the same activity.
		if (manager().hasLauncher && get(isHomeMode)) {
			await manager().launch(manager().selfPackage);
		} else {
			$$props.app.workspace.openView('orbit-home');
		}
	}

	var fragment = root_42();
	var div = first_child(fragment);
	var div_1 = child(div);
	let classes;
	var node_1 = child(div_1);

	{
		var consequent_4 = ($$anchor) => {
			var header = root_5();
			let classes_1;
			var node_2 = child(header);

			each(node_2, 16, () => get(widgets), (w) => w, ($$anchor, w) => {
				var fragment_1 = comment();
				var node_3 = first_child(fragment_1);

				{
					var consequent = ($$anchor) => {
						var div_2 = root();
						var text = only_child(div_2, true);

						template_effect(() => set_text(text, get(timeStr)));
						append($$anchor, div_2);
					};

					var consequent_1 = ($$anchor) => {
						var div_3 = root_1();
						var text_1 = only_child(div_3, true);

						template_effect(() => set_text(text_1, get(dateStr)));
						append($$anchor, div_3);
					};

					var consequent_2 = ($$anchor) => {
						var div_4 = root_2();
						var text_2 = only_child(div_4);

						template_effect(() => set_text(text_2, `Akku · ${get(batteryStr) ?? ''}`));
						append($$anchor, div_4);
					};

					if_block(node_3, ($$render) => {
						if (w === 'clock') $$render(consequent); else if (w === 'date') $$render(consequent_1, 1); else if (w === 'battery') $$render(consequent_2, 2);
					});
				}

				append($$anchor, fragment_1);
			});

			var node_4 = sibling(node_2, 2);

			each(node_4, 17, () => get(appWidgets), (aw) => aw.widgetId, ($$anchor, aw) => {
				var div_5 = root_4();
				let classes_2;
				var node_5 = child(div_5);

				{
					var consequent_3 = ($$anchor) => {
						var span = root_3();
						var node_6 = child(span);

						Icon(node_6, { name: 'trash', size: 16 });
						append($$anchor, span);
					};

					var d_1 = user_derived(() => get(brokenWidgets).includes(get(aw).widgetId));

					if_block(node_5, ($$render) => {
						if (get(d_1)) $$render(consequent_3);
					});
				}

				template_effect(
					($0, $1) => {
						classes_2 = set_class(div_5, 1, 'aw-slot svelte-13s71iz', null, classes_2, { broken: $0 });
						set_attribute(div_5, 'data-aw', get(aw).widgetId);
						set_style(div_5, `height: ${$1 ?? ''}px;`);
					},
					[
						() => get(brokenWidgets).includes(get(aw).widgetId),
						() => Math.max(90, Math.min(get(aw).minHeight, 380))
					]
				);

				append($$anchor, div_5);
			});

			template_effect(
				($0) => {
					classes_1 = set_class(header, 1, 'clock svelte-13s71iz', null, classes_1, { 'home-region': !get(appsRevealed) });
					set_style(header, $0);
				},
				[
					() => !get(appsRevealed)
						? `height: max(0px, calc(${(get(homeSplit) * 100).toFixed(1)}vh - env(safe-area-inset-top) - 40px));`
						: ''
				]
			);

			append($$anchor, header);
		};

		var consequent_5 = ($$anchor) => {
			var div_6 = root_6();

			template_effect(($0) => set_style(div_6, `height: max(0px, calc(${$0 ?? ''}vh - env(safe-area-inset-top) - 40px));`), [() => (get(homeSplit) * 100).toFixed(1)]);
			append($$anchor, div_6);
		};

		if_block(node_1, ($$render) => {
			if (get(showWidgets)) $$render(consequent_4); else if (!get(appsRevealed)) $$render(consequent_5, 1);
		});
	}

	var node_7 = sibling(node_1, 2);

	{
		var consequent_12 = ($$anchor) => {
			var fragment_2 = root_14();
			var node_8 = first_child(fragment_2);

			each(node_8, 19, () => get(sections), (s) => s.key, ($$anchor, s, i) => {
				var fragment_3 = comment();
				var node_9 = first_child(fragment_3);

				{
					var consequent_10 = ($$anchor) => {
						var section = root_12();
						let classes_3;
						var node_10 = child(section);

						{
							var consequent_6 = ($$anchor) => {
								var div_7 = root_7();
								var text_3 = only_child(div_7, true);

								template_effect(() => set_text(text_3, get(s).label));
								append($$anchor, div_7);
							};

							if_block(node_10, ($$render) => {
								if (get(s).key !== '★') $$render(consequent_6);
							});
						}

						var node_11 = sibling(node_10, 2);

						each(node_11, 17, () => get(s).apps, (a) => get(s).key + ':' + a.packageName, ($$anchor, a) => {
							var button = root_11();
							var node_12 = child(button);

							{
								var consequent_8 = ($$anchor) => {
									var fragment_4 = comment();
									var node_13 = first_child(fragment_4);

									{
										var consequent_7 = ($$anchor) => {
											var img = root_8();

											template_effect(() => set_attribute(img, 'src', get(icons)[get(a).packageName]));
											append($$anchor, img);
										};

										var alternate = ($$anchor) => {
											var span_1 = root_9();
											var text_4 = only_child(span_1, true);

											template_effect(($0) => set_text(text_4, $0), [() => get(a).label.charAt(0)]);
											append($$anchor, span_1);
										};

										if_block(node_13, ($$render) => {
											if (get(icons)[get(a).packageName]) $$render(consequent_7); else $$render(alternate, -1);
										});
									}

									append($$anchor, fragment_4);
								};

								if_block(node_12, ($$render) => {
									if (get(showIcons)) $$render(consequent_8);
								});
							}

							var node_14 = sibling(node_12, 2);

							{
								var consequent_9 = ($$anchor) => {
									var span_2 = root_10();
									var text_5 = only_child(span_2, true);

									template_effect(() => set_text(text_5, get(a).label));
									append($$anchor, span_2);
								};

								if_block(node_14, ($$render) => {
									if (get(showLabels)) $$render(consequent_9);
								});
							}
							action(button, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => () => set(menuApp, get(a), true));
							delegated('click', button, () => launch(get(a).packageName));
							append($$anchor, button);
						});
						bind_this(section, ($$value, s) => sectionEls[s.key] = $$value, (s) => sectionEls?.[s.key], () => [get(s)]);

						template_effect(
							($0) => {
								classes_3 = set_class(section, 1, 'group svelte-13s71iz', null, classes_3, { active: get(scrubbing) && get(i) === get(activeIndex) });
								set_style(section, `scroll-margin-top: ${$0 ?? ''}vh;`);
							},
							[() => Math.round(get(sectionAnchor) * 100)]
						);

						append($$anchor, section);
					};

					if_block(node_9, ($$render) => {
						if (get(appsRevealed) || get(s).key === '★') $$render(consequent_10);
					});
				}

				append($$anchor, fragment_3);
			});

			var node_15 = sibling(node_8, 2);

			{
				var consequent_11 = ($$anchor) => {
					var footer = root_13();
					var button_1 = child(footer);
					var node_16 = child(button_1);

					Icon(node_16, { name: 'settings', size: 20 });

					var button_2 = sibling(button_1, 2);
					var node_17 = child(button_2);

					Icon(node_17, { name: 'plugin', size: 20 });
					delegated('click', button_1, () => set(settingsOpen, true));
					delegated('click', button_2, openOrbitApp);
					append($$anchor, footer);
				};

				if_block(node_15, ($$render) => {
					if (get(appsRevealed)) $$render(consequent_11);
				});
			}

			append($$anchor, fragment_2);
		};

		var consequent_13 = ($$anchor) => {
			var p_1 = root_15();

			append($$anchor, p_1);
		};

		var alternate_1 = ($$anchor) => {
			var p_2 = root_16();

			append($$anchor, p_2);
		};

		if_block(node_7, ($$render) => {
			if (get(sections).length > 0) $$render(consequent_12); else if (hasLauncher) $$render(consequent_13, 1); else $$render(alternate_1, -1);
		});
	}
	bind_this(div_1, ($$value) => listEl = $$value, () => listEl);
	action(div_1, ($$node) => homeLongpress?.($$node));

	var node_18 = sibling(div_1, 2);

	{
		var consequent_15 = ($$anchor) => {
			var div_8 = root_19();
			let classes_4;
			var node_19 = child(div_8);

			each(node_19, 19, () => get(sections), (s) => s.key, ($$anchor, s, i) => {
				var span_3 = root_17();
				let classes_5;
				var text_6 = only_child(span_3, true);

				template_effect(
					($0) => {
						classes_5 = set_class(span_3, 1, 'scrub-key svelte-13s71iz', null, classes_5, { active: get(scrubbing) && get(i) === get(activeIndex) });
						set_style(span_3, $0);
						set_text(text_6, get(s).key);
					},
					[() => letterStyle(get(i))]
				);

				append($$anchor, span_3);
			});

			var node_20 = sibling(node_19, 2);

			{
				var consequent_14 = ($$anchor) => {
					var div_9 = root_18();
					var text_7 = only_child(div_9, true);

					template_effect(
						($0) => {
							set_style(div_9, `top: ${get(bubbleTop) ?? ''}px; width: ${get(bubbleSize) ?? ''}px; height: ${get(bubbleSize) ?? ''}px; right: ${get(bubbleRight) ?? ''}px; font-size: ${$0 ?? ''}px;`);
							set_text(text_7, get(sections)[get(activeIndex)].key);
						},
						[() => Math.round(get(bubbleSize) * 0.46)]
					);

					append($$anchor, div_9);
				};

				if_block(node_20, ($$render) => {
					if (get(scrubbing) && get(activeIndex) >= 0 && get(bubbleVisible)) $$render(consequent_14);
				});
			}
			bind_this(div_8, ($$value) => scrubEl = $$value, () => scrubEl);

			template_effect(
				($0) => {
					classes_4 = set_class(div_8, 1, 'scrubber svelte-13s71iz', null, classes_4, { hidden: !get(railVisible) });
					set_style(div_8, `top: ${get(railPos) * 100}%; height: ${$0 ?? ''}%; right: ${get(railRight) ?? ''}px;`);
				},
				[() => Math.round(get(railHeightFrac) * 100)]
			);

			delegated('pointerdown', div_8, onScrubDown);
			delegated('pointermove', div_8, onScrubMove);
			delegated('pointerup', div_8, onScrubUp);
			event('pointercancel', div_8, onScrubUp);
			append($$anchor, div_8);
		};

		if_block(node_18, ($$render) => {
			if (hasLauncher && get(sections).length > 0) $$render(consequent_15);
		});
	}

	var node_21 = sibling(div, 2);

	{
		var consequent_17 = ($$anchor) => {
			var div_10 = root_21();
			var div_11 = child(div_10);
			var div_12 = child(div_11);
			var text_8 = only_child(div_12, true);
			var button_3 = sibling(div_12, 2);
			var node_22 = child(button_3);

			Icon(node_22, { name: 'star', size: 20 });

			var text_9 = sibling(node_22);

			var button_4 = sibling(button_3, 2);
			var node_23 = child(button_4);

			Icon(node_23, { name: 'close', size: 20 });

			var node_24 = sibling(button_4, 2);

			{
				var consequent_16 = ($$anchor) => {
					var fragment_5 = root_20();
					var button_5 = first_child(fragment_5);
					var node_25 = child(button_5);

					Icon(node_25, { name: 'settings', size: 20 });

					var button_6 = sibling(button_5, 2);
					var node_26 = child(button_6);

					Icon(node_26, { name: 'trash', size: 20 });
					delegated('click', button_5, () => get(menuApp) && appInfoApp(get(menuApp).packageName));
					delegated('click', button_6, () => get(menuApp) && uninstallApp(get(menuApp).packageName));
					append($$anchor, fragment_5);
				};

				if_block(node_24, ($$render) => {
					if (get(menuApp).packageName !== manager().selfPackage) $$render(consequent_16);
				});
			}

			template_effect(
				($0) => {
					set_attribute(div_11, 'aria-label', get(menuApp).label);
					set_text(text_8, get(menuApp).label);
					set_text(text_9, ` ${$0 ?? ''}`);
				},
				[
					() => get(menuApp) && manager().isFavorite(get(menuApp).packageName) ? 'Favorit entfernen' : 'Favorisieren'
				]
			);

			delegated('click', div_10, () => set(menuApp, null));
			delegated('click', div_11, (e) => e.stopPropagation());
			delegated('click', button_3, () => get(menuApp) && toggleFavorite(get(menuApp).packageName));
			delegated('click', button_4, () => get(menuApp) && hideApp(get(menuApp).packageName));
			append($$anchor, div_10);
		};

		if_block(node_21, ($$render) => {
			if (get(menuApp)) $$render(consequent_17);
		});
	}

	var node_27 = sibling(node_21, 2);

	{
		var consequent_19 = ($$anchor) => {
			var div_13 = root_23();
			var div_14 = child(div_13);
			var button_7 = child(div_14);
			var node_28 = child(button_7);

			Icon(node_28, { name: 'rows', size: 20 });

			var button_8 = sibling(button_7, 2);
			var node_29 = child(button_8);

			Icon(node_29, { name: 'settings', size: 20 });

			var node_30 = sibling(button_8, 2);

			{
				var consequent_18 = ($$anchor) => {
					var button_9 = root_22();
					var node_31 = child(button_9);

					Icon(node_31, { name: 'trash', size: 20 });

					delegated('click', button_9, () => {
						const id = get(widgetMenuId);

						set(editMenuOpen, false);
						set(widgetMenuId, null);

						if (id !== null) void removeAppWidget(id);
					});

					append($$anchor, button_9);
				};

				if_block(node_30, ($$render) => {
					if (get(widgetMenuId) !== null) $$render(consequent_18);
				});
			}

			delegated('click', div_13, () => {
				set(editMenuOpen, false);
				set(widgetMenuId, null);
			});

			delegated('click', div_14, (e) => e.stopPropagation());

			delegated('click', button_7, () => {
				set(editMenuOpen, false);
				set(widgetMenuId, null);
				set(editing, true);
			});

			delegated('click', button_8, () => {
				set(editMenuOpen, false);
				set(widgetMenuId, null);
				set(settingsOpen, true);
			});

			append($$anchor, div_13);
		};

		if_block(node_27, ($$render) => {
			if (get(editMenuOpen)) $$render(consequent_19);
		});
	}

	var node_32 = sibling(node_27, 2);

	{
		var consequent_21 = ($$anchor) => {
			var div_15 = root_25();
			var div_16 = child(div_15);
			var button_10 = only_child(div_16);
			var div_17 = sibling(div_16, 2);
			var button_11 = only_child(div_17);
			var node_33 = sibling(div_17, 2);

			{
				var consequent_20 = ($$anchor) => {
					var button_12 = root_24();
					var node_34 = child(button_12);

					Icon(node_34, { name: 'plus', size: 20 });

					delegated('click', button_12, () => {
						set(editing, false);
						void openWidgetPicker();
					});

					append($$anchor, button_12);
				};

				if_block(node_33, ($$render) => {
					if (appwidgets) $$render(consequent_20);
				});
			}

			var button_13 = sibling(node_33, 2);

			template_effect(() => {
				set_style(div_16, `top: ${get(homeSplit) * 100}%;`);
				set_style(div_17, `top: calc(${get(railPos) * 100}% - ${get(railHeightFrac) * 50}%);`);
			});

			delegated('pointermove', div_15, onDragMove);
			delegated('pointerup', div_15, onDragEnd);
			event('pointercancel', div_15, onDragEnd);
			delegated('pointerdown', button_10, (e) => startDrag(e, 'split'));
			delegated('pointerdown', button_11, (e) => startDrag(e, 'rail'));
			delegated('click', button_13, () => set(editing, false));
			append($$anchor, div_15);
		};

		if_block(node_32, ($$render) => {
			if (get(editing)) $$render(consequent_21);
		});
	}

	var node_35 = sibling(node_32, 2);

	{
		var consequent_25 = ($$anchor) => {
			var div_18 = root_34();
			var div_19 = child(div_18);
			var node_36 = child(div_19);

			Icon(node_36, { name: 'search', size: 18 });

			var input = sibling(node_36, 2);

			var button_14 = sibling(input, 2);
			var node_37 = child(button_14);

			Icon(node_37, { name: 'close', size: 20 });

			var div_20 = sibling(div_19, 2);

			each(div_20, 21, () => get(widgetApps), (sec) => sec.key, ($$anchor, sec) => {
				var fragment_6 = root_33();
				var div_21 = first_child(fragment_6);
				var text_10 = only_child(div_21, true);
				var node_38 = sibling(div_21, 2);

				each(node_38, 17, () => get(sec).apps, (a) => a.pkg, ($$anchor, a) => {
					var fragment_7 = root_32();
					var button_15 = first_child(fragment_7);
					var node_39 = child(button_15);

					{
						var consequent_22 = ($$anchor) => {
							var img_1 = root_26();

							template_effect(() => set_attribute(img_1, 'src', get(widgetAppIcons)[get(a).pkg]));
							append($$anchor, img_1);
						};

						var alternate_2 = ($$anchor) => {
							var span_4 = root_27();
							var text_11 = only_child(span_4, true);

							template_effect(($0) => set_text(text_11, $0), [() => get(a).appLabel.charAt(0)]);
							append($$anchor, span_4);
						};

						if_block(node_39, ($$render) => {
							if (get(widgetAppIcons)[get(a).pkg]) $$render(consequent_22); else $$render(alternate_2, -1);
						});
					}

					var span_5 = sibling(node_39, 2);
					var span_6 = child(span_5);
					var text_12 = only_child(span_6, true);
					var span_7 = sibling(span_6, 2);
					var text_13 = only_child(span_7);

					var node_40 = sibling(button_15, 2);

					{
						var consequent_24 = ($$anchor) => {
							var div_22 = root_31();

							each(div_22, 21, () => get(a).widgets, (w) => w.cls, ($$anchor, w) => {
								var button_16 = root_30();
								var node_41 = child(button_16);

								{
									var consequent_23 = ($$anchor) => {
										var img_2 = root_28();

										template_effect(() => set_attribute(img_2, 'src', get(w).preview));
										append($$anchor, img_2);
									};

									var alternate_3 = ($$anchor) => {
										var div_23 = root_29();

										append($$anchor, div_23);
									};

									if_block(node_41, ($$render) => {
										if (get(w).preview) $$render(consequent_23); else $$render(alternate_3, -1);
									});
								}

								var span_8 = sibling(node_41, 2);
								var text_14 = only_child(span_8, true);
								template_effect(() => set_text(text_14, get(w).label));
								delegated('click', button_16, () => chooseProvider(get(w).pkg, get(w).cls));
								append($$anchor, button_16);
							});
							append($$anchor, div_22);
						};

						if_block(node_40, ($$render) => {
							if (get(expandedApp) === get(a).pkg) $$render(consequent_24);
						});
					}

					template_effect(() => {
						set_text(text_12, get(a).appLabel);
						set_text(text_13, `${get(a).widgets.length ?? ''} Widget${get(a).widgets.length === 1 ? '' : 's'}`);
					});

					delegated('click', button_15, () => set(expandedApp, get(expandedApp) === get(a).pkg ? null : get(a).pkg, true));
					append($$anchor, fragment_7);
				});

				template_effect(() => set_text(text_10, get(sec).key));
				append($$anchor, fragment_6);
			});
			bind_value(input, () => get(widgetSearch), ($$value) => set(widgetSearch, $$value));
			delegated('click', button_14, () => set(widgetPickerOpen, false));
			append($$anchor, div_18);
		};

		if_block(node_35, ($$render) => {
			if (get(widgetPickerOpen)) $$render(consequent_25);
		});
	}

	var node_42 = sibling(node_35, 2);

	{
		var consequent_30 = ($$anchor) => {
			var div_24 = root_40();
			var div_25 = child(div_24);
			var button_17 = child(div_25);
			var node_43 = child(button_17);

			Icon(node_43, { name: 'close', size: 24 });

			var div_26 = sibling(div_25, 2);
			var button_18 = child(div_26);
			var span_9 = sibling(child(button_18), 2);
			let classes_6;

			var node_44 = sibling(button_18, 2);

			{
				var consequent_27 = ($$anchor) => {
					var fragment_8 = root_38();
					var div_27 = first_child(fragment_8);
					var div_28 = sibling(child(div_27), 2);

					each(div_28, 21, () => AVAILABLE_WIDGETS, (w) => w.id, ($$anchor, w) => {
						var button_19 = root_35();
						let classes_7;
						var text_15 = only_child(button_19, true);

						template_effect(
							($0) => {
								classes_7 = set_class(button_19, 1, 'chip svelte-13s71iz', null, classes_7, { on: $0 });
								set_text(text_15, get(w).label);
							},
							[() => get(widgets).includes(get(w).id)]
						);

						delegated('click', button_19, () => toggleWidget(get(w).id));
						append($$anchor, button_19);
					});

					var node_45 = sibling(div_27, 2);

					{
						var consequent_26 = ($$anchor) => {
							var div_29 = root_37();
							var node_46 = sibling(child(div_29), 2);

							each(node_46, 17, () => get(appWidgets), (aw) => aw.widgetId, ($$anchor, aw) => {
								var div_30 = root_36();
								var span_10 = child(div_30);
								var text_16 = only_child(span_10, true);
								var button_20 = sibling(span_10, 2);
								var node_47 = child(button_20);

								Icon(node_47, { name: 'trash', size: 18 });
								template_effect(() => set_text(text_16, get(aw).label));
								delegated('click', button_20, () => removeAppWidget(get(aw).widgetId));
								append($$anchor, div_30);
							});
							append($$anchor, div_29);
						};

						if_block(node_45, ($$render) => {
							if (appwidgets) $$render(consequent_26);
						});
					}

					append($$anchor, fragment_8);
				};

				if_block(node_44, ($$render) => {
					if (get(showWidgets)) $$render(consequent_27);
				});
			}

			var button_21 = sibling(node_44, 2);
			var span_11 = sibling(child(button_21), 2);
			let classes_8;

			var button_22 = sibling(button_21, 2);
			var span_12 = sibling(child(button_22), 2);
			let classes_9;

			var div_31 = sibling(button_22, 2);
			var div_32 = child(div_31);
			var span_13 = sibling(child(div_32), 2);
			var text_17 = only_child(span_13);

			var input_1 = sibling(div_32, 2);

			var div_33 = sibling(div_31, 2);
			var div_34 = child(div_33);
			var span_14 = sibling(child(div_34), 2);
			var text_18 = only_child(span_14);

			var input_2 = sibling(div_34, 2);

			var div_35 = sibling(div_33, 2);
			var div_36 = child(div_35);
			var span_15 = sibling(child(div_36), 2);
			var text_19 = only_child(span_15);

			var input_3 = sibling(div_36, 2);

			var div_37 = sibling(div_35, 2);
			var div_38 = child(div_37);
			var span_16 = sibling(child(div_38), 2);
			var text_20 = only_child(span_16);

			var input_4 = sibling(div_38, 2);

			var div_39 = sibling(div_37, 2);
			var div_40 = child(div_39);
			var span_17 = sibling(child(div_40), 2);
			var text_21 = only_child(span_17);

			var input_5 = sibling(div_40, 2);

			var button_23 = sibling(div_39, 2);
			var span_18 = sibling(child(button_23), 2);
			let classes_10;

			var div_41 = sibling(button_23, 2);
			var div_42 = child(div_41);
			var span_19 = sibling(child(div_42), 2);
			var text_22 = only_child(span_19);

			var input_6 = sibling(div_42, 2);

			var div_43 = sibling(div_41, 2);
			var div_44 = child(div_43);
			var span_20 = sibling(child(div_44), 2);
			var text_23 = only_child(span_20);

			var input_7 = sibling(div_44, 2);

			var button_24 = sibling(div_43, 2);
			var span_21 = sibling(child(button_24), 2);
			let classes_11;

			var button_25 = sibling(button_24, 2);
			var span_22 = sibling(child(button_25), 2);
			let classes_12;

			var div_45 = sibling(button_25, 2);
			var div_46 = child(div_45);
			var span_23 = sibling(child(div_46), 2);
			var text_24 = only_child(span_23);

			var input_8 = sibling(div_46, 2);

			var div_47 = sibling(div_45, 2);
			var div_48 = child(div_47);
			var span_24 = sibling(child(div_48), 2);
			var text_25 = only_child(span_24);

			var input_9 = sibling(div_48, 2);

			var div_49 = sibling(div_47, 2);
			var div_50 = child(div_49);
			var span_25 = sibling(child(div_50), 2);
			var text_26 = only_child(span_25);

			var input_10 = sibling(div_50, 2);

			var div_51 = sibling(div_49, 2);
			var div_52 = sibling(child(div_51), 2);

			each(div_52, 21, () => FONTS, (f) => f.label, ($$anchor, f) => {
				var button_26 = root_35();
				let classes_13;
				var text_27 = only_child(button_26, true);

				template_effect(() => {
					classes_13 = set_class(button_26, 1, 'chip svelte-13s71iz', null, classes_13, { on: get(fontFamily) === get(f).value });
					set_style(button_26, get(f).value ? `font-family: ${get(f).value};` : '');
					set_text(text_27, get(f).label);
				});

				delegated('click', button_26, () => setFont(get(f).value));
				append($$anchor, button_26);
			});

			var div_53 = sibling(div_51, 2);
			var node_48 = sibling(child(div_53), 2);

			ColorMenu(node_48, {
				get roles() {
					return colorRoles;
				},
				get: (k) => get(colors)[k] ?? '',
				set: setColor,
				get skwdAvailable() {
					return skwdAvailable;
				},
				autoLabel: 'Auto'
			});

			var span_26 = sibling(node_48, 2);
			var node_49 = sibling(child(span_26));

			{
				var consequent_28 = ($$anchor) => {
					var text_28 = text('· SKWD = Wallpaper-Farben');

					append($$anchor, text_28);
				};

				if_block(node_49, ($$render) => {
					if (skwdAvailable) $$render(consequent_28);
				});
			}

			var div_54 = sibling(div_53, 2);
			var div_55 = child(div_54);
			var span_27 = sibling(child(div_55), 2);
			var text_29 = only_child(span_27);

			var input_11 = sibling(div_55, 2);

			var node_50 = sibling(div_54, 2);

			{
				var consequent_29 = ($$anchor) => {
					var button_27 = root_39();
					var node_51 = child(button_27);

					Icon(node_51, { name: 'home', size: 20 });
					delegated('click', button_27, makeDefault);
					append($$anchor, button_27);
				};

				if_block(node_50, ($$render) => {
					if (hasLauncher && !get(isDefault)) $$render(consequent_29);
				});
			}

			var button_28 = sibling(node_50, 2);
			var node_52 = child(button_28);

			Icon(node_52, { name: 'check', size: 20 });

			var text_30 = sibling(node_52);

			var button_29 = sibling(button_28, 2);
			var node_53 = child(button_29);

			Icon(node_53, { name: 'plugin', size: 20 });

			template_effect(
				($0, $1, $2, $3, $4, $5) => {
					classes_6 = set_class(span_9, 1, 'switch svelte-13s71iz', null, classes_6, { on: get(showWidgets) });
					classes_8 = set_class(span_11, 1, 'switch svelte-13s71iz', null, classes_8, { on: get(hapticsEnabled) });
					classes_9 = set_class(span_12, 1, 'switch svelte-13s71iz', null, classes_9, { on: get(railAlways) });
					set_text(text_17, `${$0 ?? ''}%`);
					set_value(input_1, get(sectionAnchor));
					set_text(text_18, `${$1 ?? ''}%`);
					set_value(input_2, get(railHeightFrac));
					set_text(text_19, `${get(railRight) ?? ''}px`);
					set_value(input_3, get(railRight));
					set_text(text_20, `${$2 ?? ''}%`);
					set_value(input_4, get(waveStrength));
					set_text(text_21, `${$3 ?? ''}%`);
					set_value(input_5, get(verticalSpread));
					classes_10 = set_class(span_18, 1, 'switch svelte-13s71iz', null, classes_10, { on: get(bubbleVisible) });
					set_text(text_22, `${get(bubbleSize) ?? ''}px`);
					set_value(input_6, get(bubbleSize));
					set_text(text_23, `${get(bubbleRight) ?? ''}px`);
					set_value(input_7, get(bubbleRight));
					classes_11 = set_class(span_21, 1, 'switch svelte-13s71iz', null, classes_11, { on: get(showIcons) });
					classes_12 = set_class(span_22, 1, 'switch svelte-13s71iz', null, classes_12, { on: get(showLabels) });
					set_text(text_24, `${get(iconSize) ?? ''}px`);
					set_value(input_8, get(iconSize));
					set_text(text_25, `${$4 ?? ''}%`);
					set_value(input_9, get(labelScale));
					set_text(text_26, `${$5 ?? ''}%`);
					set_value(input_10, get(railLabelScale));
					set_text(text_29, `${get(leftPad) ?? ''}px`);
					set_value(input_11, get(leftPad));

					set_text(text_30, ` ${get(copied)
						? 'Gesendet ✓'
						: 'Aktuelle Optik an Sojus senden (als Standard)'}`);
				},
				[
					() => Math.round(get(sectionAnchor) * 100),
					() => Math.round(get(railHeightFrac) * 100),
					() => Math.round(get(waveStrength) * 100),
					() => Math.round(get(verticalSpread) * 100),
					() => Math.round(get(labelScale) * 100),
					() => Math.round(get(railLabelScale) * 100)
				]
			);

			delegated('click', button_17, () => set(settingsOpen, false));
			delegated('click', button_18, () => setShowWidgets(!get(showWidgets)));
			delegated('click', button_21, () => setHaptics(!get(hapticsEnabled)));
			delegated('click', button_22, () => setRailAlways(!get(railAlways)));
			delegated('input', input_1, (e) => setAnchor(+e.currentTarget.value));
			delegated('input', input_2, (e) => setRailHeight(+e.currentTarget.value));
			delegated('input', input_3, (e) => setRailRight(+e.currentTarget.value));
			delegated('input', input_4, (e) => setWave(+e.currentTarget.value));
			delegated('input', input_5, (e) => setVerticalSpread(+e.currentTarget.value));
			delegated('click', button_23, () => setBubbleVisible(!get(bubbleVisible)));
			delegated('input', input_6, (e) => setBubbleSize(+e.currentTarget.value));
			delegated('input', input_7, (e) => setBubbleRight(+e.currentTarget.value));
			delegated('click', button_24, () => setShowIcons(!get(showIcons)));
			delegated('click', button_25, () => setShowLabels(!get(showLabels)));
			delegated('input', input_8, (e) => setIconSize(+e.currentTarget.value));
			delegated('input', input_9, (e) => setLabelScale(+e.currentTarget.value));
			delegated('input', input_10, (e) => setRailLabelScale(+e.currentTarget.value));
			delegated('input', input_11, (e) => setLeftPad(+e.currentTarget.value));
			delegated('click', button_28, copyAppearance);
			delegated('click', button_29, openOrbitApp);
			append($$anchor, div_24);
		};

		if_block(node_42, ($$render) => {
			if (get(settingsOpen)) $$render(consequent_30);
		});
	}

	var node_54 = sibling(node_42, 2);

	{
		var consequent_31 = ($$anchor) => {
			var div_56 = root_41();
			var button_30 = sibling(child(div_56), 4);
			var node_55 = child(button_30);

			Icon(node_55, { name: 'close', size: 24 });

			var div_57 = sibling(button_30, 2);
			var button_31 = sibling(child(div_57), 8);
			delegated('click', button_30, () => set(showDefaultPrompt, false));

			delegated('click', button_31, () => {
				void makeDefault();
				set(showDefaultPrompt, false);
			});

			append($$anchor, div_56);
		};

		if_block(node_54, ($$render) => {
			if (get(showDefaultPrompt)) $$render(consequent_31);
		});
	}

	template_effect(() => {
		set_style(div, `--app-icon: ${get(iconSize) ?? ''}px; --app-label-scale: ${get(labelScale) ?? ''}; --rail-label-scale: ${get(railLabelScale) ?? ''}; --list-pad: ${get(leftPad) ?? ''}px; --app-font: ${(get(fontFamily) || 'var(--font-ui)') ?? ''}; ${get(colorVars) ?? ''}`);
		classes = set_class(div_1, 1, 'list svelte-13s71iz', null, classes, { focusing: get(scrubbing) });
	});

	append($$anchor, fragment);
	pop();
}

delegate(['click', 'pointerdown', 'pointermove', 'pointerup', 'input']);

const manifest = {
  id: "orbit-launcher",
  name: "Orbit Launcher",
  version: "0.1.0",
  description: "Orbit als Startbildschirm: eine minimalistische, wallpaper-forward Startseite mit Uhr, Datum und Favoriten, einer A–Z-Wellen-Leiste zum Scrubben durch alle Apps, Android-Widgets und vielen Feineinstellungen. Nutzt die nativen launcher-/widget-Capabilities; voll nur in der Android-App.",
  author: "Sojus",
  main: "index.ts",
  type: "gui",
  // GUI is previewable everywhere (clock/date render in the browser); the real
  // launcher powers are Android-only and degrade via the capability check.
  platforms: ["mobile", "desktop", "web"],
  capabilities: ["launcher", "wallpaper", "appwidgets", "haptics", "orientation"],
  news: [
    {
      version: "0.1.0",
      date: "2026-10-11",
      text: "Erste Version: wallpaper-forward Startseite mit Uhr, Datum und Favoriten; A–Z-Wellen-Leiste zum Scrubben durch alle Apps; Apps anheften/starten/deinstallieren; Android-Widgets hinzufügen & entfernen; Haptik, Farben/Schrift und Layout fein einstellbar; Orbit als Standard-Startbildschirm festlegbar."
    }
  ]
};
const VIEW_ID = "orbit-launcher-home";
class HomeView extends View {
  constructor(app, manager) {
    super(app);
    this.manager = manager;
  }
  component = null;
  // Render as a clean home screen — the shell hides its chrome for this view.
  chromeless = true;
  getViewType() {
    return VIEW_ID;
  }
  getDisplayName() {
    return "Launcher";
  }
  getIcon() {
    return "home";
  }
  async onOpen() {
    this.component = mount(Home, {
      target: this.containerEl,
      props: { app: this.app, manager: this.manager }
    });
  }
  async onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
  }
}
class OrbitLauncherPlugin extends Plugin {
  manager;
  constructor(app, m) {
    super(app, m);
  }
  async onload() {
    this.manager = new LauncherManager(this.app);
    this.registerView(VIEW_ID, () => new HomeView(this.app, this.manager));
    this.addNavigationItem({ id: VIEW_ID, name: "Launcher", icon: "home", priority: 1 });
    this.addCommand({
      id: "open",
      name: "Orbit Launcher öffnen",
      callback: () => this.app.workspace.openView(VIEW_ID)
    });
    this.addSettingTab({
      id: "orbit-launcher-settings",
      name: "Launcher",
      icon: "home",
      // Gear → open the launcher and its settings page directly (the Plugins
      // area closes). render is a harmless fallback if navigate isn't honoured.
      navigate: () => {
        this.app.workspace.openView(VIEW_ID);
        this.manager.requestSettings();
      },
      render: (el) => {
        el.innerHTML = '<div style="padding:16px;color:var(--text)">Launcher-Einstellungen öffnen…</div>';
        this.app.workspace.openView(VIEW_ID);
        this.manager.requestSettings();
      }
    });
  }
  async onunload() {
    this.manager.dispose();
  }
}

export { OrbitLauncherPlugin as default, manifest };
