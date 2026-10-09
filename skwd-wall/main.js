const O = globalThis.Orbit;
const Plugin = O.Plugin;
const View = O.View;
const Store = O.Store;
O.MapStore;

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

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

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

/**
 * When encountering a situation like `let [a, b, c] = $derived(blah())`,
 * we need to stash an intermediate value that `a`, `b`, and `c` derive
 * from, in case it's an iterable
 * @template T
 * @param {ArrayLike<T> | Iterable<T>} value
 * @param {number} [n]
 * @returns {Array<T>}
 */
function to_array(value, n) {
	// return arrays unchanged
	if (Array.isArray(value)) {
		return value;
	}

	// if value is not iterable, or `n` is unspecified (indicates a rest
	// element, which means we're not concerned about unbounded iterables)
	// convert to an array with `Array.from`
	if (!(Symbol.iterator in value)) {
		return Array.from(value);
	}

	// otherwise, populate an array with `n` values

	/** @type {T[]} */
	const array = [];

	for (const element of value) {
		array.push(element);
		if (array.length === n) break;
	}

	return array;
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
const TRANSITION_GLOBAL = 1 << 2;

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
 * The `value` property of a `<select multiple>` element should be an array, but it received a non-array value. The selection will be kept as is.
 */
function select_multiple_invalid_value() {
	{
		console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
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

/**
 * @param {any} value
 */
function get_proxied_value(value) {
	try {
		if (value !== null && typeof value === 'object' && STATE_SYMBOL in value) {
			return value[STATE_SYMBOL];
		}
	} catch {
		// the above if check can throw an error if the value in question
		// is the contentWindow of an iframe on another domain, in which
		// case we want to just return the value (because it's definitely
		// not a proxied value) so we don't break any JavaScript interacting
		// with that iframe (such as various payment companies client side
		// JavaScript libraries interacting with their iframes on the same
		// domain)
	}

	return value;
}

/**
 * @param {any} a
 * @param {any} b
 */
function is(a, b) {
	return Object.is(get_proxied_value(a), get_proxied_value(b));
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

	var is_fragment = (flags & TEMPLATE_FRAGMENT) !== 0;
	var wrapped = `<${ns}>${has_start ? content : '<!>' + content}</${ns}>`;

	/** @type {Element | DocumentFragment} */
	var node;

	return () => {

		if (!node) {
			var fragment = /** @type {DocumentFragment} */ (create_fragment_from_html(wrapped));
			var root = /** @type {Element} */ (get_first_child(fragment));

			if (is_fragment) {
				node = document.createDocumentFragment();
				while (get_first_child(root)) {
					node.appendChild(/** @type {TemplateNode} */ (get_first_child(root)));
				}
			} else {
				node = /** @type {Element} */ (get_first_child(root));
			}
		}

		var clone = /** @type {TemplateNode} */ (node.cloneNode(true));

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
 * This is normally true — block effects should run their intro transitions —
 * but is false during hydration (unless `options.intro` is `true`) and
 * when creating the children of a `<svelte:element>` that just changed tag
 */
let should_intro = true;

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

				should_intro = intro;
				// @ts-expect-error the public typings are not what the actual function looks like
				component = Component(anchor_node, props) || mark_as_component();
				should_intro = true;

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

/** @import { TemplateNode } from '#client' */

const NAN = Symbol('NaN');

/**
 * @template V
 * @param {TemplateNode} node
 * @param {() => V} get_key
 * @param {(anchor: Node) => TemplateNode | void} render_fn
 * @returns {void}
 */
function key(node, get_key, render_fn) {

	var branches = new BranchManager(node);

	block(() => {
		var key = get_key();

		// NaN !== NaN, hence we do this workaround to not trigger remounts unnecessarily
		if (key !== key) {
			key = /** @type {any} */ (NAN);
		}

		branches.ensure(key, render_fn);
	});
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

/** @import { Snippet } from 'svelte' */
/** @import { TemplateNode } from '#client' */
/** @import { Getters } from '#shared' */

/**
 * @template {(node: TemplateNode, ...args: any[]) => void} SnippetFn
 * @param {TemplateNode} node
 * @param {() => SnippetFn | null | undefined} get_snippet
 * @param {(() => any)[]} args
 * @returns {void}
 */
function snippet(node, get_snippet, ...args) {
	var branches = new BranchManager(node);

	block(() => {
		const snippet = get_snippet() ?? null;

		branches.ensure(snippet, snippet && ((anchor) => snippet(anchor, ...args)));
	}, EFFECT_TRANSPARENT);
}

/** @import { Raf } from '#client' */

const now = () => performance.now() ;

/** @type {Raf} */
const raf = {
	// don't access requestAnimationFrame eagerly outside method
	// this allows basic testing of user code without JSDOM
	// bunder will eval and remove ternary when the user's app is built
	tick: /** @param {any} _ */ (_) => (requestAnimationFrame )(_),
	now: () => now(),
	tasks: new Set()
};

/** @import { TaskCallback, Task, TaskEntry } from '#client' */

// TODO move this into timing.js where it probably belongs

/**
 * @returns {void}
 */
function run_tasks() {
	// use `raf.now()` instead of the `requestAnimationFrame` callback argument, because
	// otherwise things can get wonky https://github.com/sveltejs/svelte/pull/14541
	const now = raf.now();

	raf.tasks.forEach((task) => {
		if (!task.c(now)) {
			raf.tasks.delete(task);
			task.f();
		}
	});

	if (raf.tasks.size !== 0) {
		raf.tick(run_tasks);
	}
}

/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 * @param {TaskCallback} callback
 * @returns {Task}
 */
function loop(callback) {
	/** @type {TaskEntry} */
	let task;

	if (raf.tasks.size === 0) {
		raf.tick(run_tasks);
	}

	return {
		promise: new Promise((fulfill) => {
			raf.tasks.add((task = { c: callback, f: fulfill }));
		}),
		abort() {
			raf.tasks.delete(task);
		}
	};
}

/** @import { AnimateFn, Animation, AnimationConfig, EachItem, Effect, EffectNodes, TransitionFn, TransitionManager } from '#client' */

/**
 * @param {Element} element
 * @param {'introstart' | 'introend' | 'outrostart' | 'outroend'} type
 * @returns {void}
 */
function dispatch_event(element, type) {
	without_reactive_context(() => {
		element.dispatchEvent(new CustomEvent(type));
	});
}

/**
 * Converts a property to the camel-case format expected by Element.animate(), KeyframeEffect(), and KeyframeEffect.setKeyframes().
 * @param {string} style
 * @returns {string}
 */
function css_property_to_camelcase(style) {
	// in compliance with spec
	if (style === 'float') return 'cssFloat';
	if (style === 'offset') return 'cssOffset';

	// do not rename custom @properties
	if (style.startsWith('--')) return style;

	const parts = style.split('-');
	if (parts.length === 1) return parts[0];
	return (
		parts[0] +
		parts
			.slice(1)
			.map(/** @param {any} word */ (word) => word[0].toUpperCase() + word.slice(1))
			.join('')
	);
}

/**
 * @param {string} css
 * @returns {Keyframe}
 */
function css_to_keyframe(css) {
	/** @type {Keyframe} */
	const keyframe = {};
	const parts = css.split(';');
	for (const part of parts) {
		const [property, value] = part.split(':');
		if (!property || value === undefined) break;

		const formatted_property = css_property_to_camelcase(property.trim());
		keyframe[formatted_property] = value.trim();
	}
	return keyframe;
}

/** @param {number} t */
const linear$1 = (t) => t;

/**
 * Called inside block effects as `$.transition(...)`. This creates a transition manager and
 * attaches it to the current effect — later, inside `pause_effect` and `resume_effect`, we
 * use this to create `intro` and `outro` transitions.
 * @template P
 * @param {number} flags
 * @param {HTMLElement} element
 * @param {() => TransitionFn<P | undefined>} get_fn
 * @param {(() => P) | null} get_params
 * @returns {void}
 */
function transition(flags, element, get_fn, get_params) {
	var is_global = (flags & TRANSITION_GLOBAL) !== 0;

	/** @type {'in' | 'out' | 'both'} */
	var direction = 'in' ;

	/** @type {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig) | undefined} */
	var current_options;

	var inert = element.inert;

	/**
	 * The default overflow style, stashed so we can revert changes during the transition
	 * that are necessary to work around a Safari <18 bug
	 * TODO 6.0 remove this, if older versions of Safari have died out enough
	 */
	var overflow = element.style.overflow;

	/** @type {Animation | undefined} */
	var intro;

	/** @type {Animation | undefined} */
	var outro;

	function get_options() {
		return without_reactive_context(() => {
			// If a transition is still ongoing, we use the existing options rather than generating
			// new ones. This ensures that reversible transitions reverse smoothly, rather than
			// jumping to a new spot because (for example) a different `duration` was used
			return (current_options ??= get_fn()(element, get_params?.() ?? /** @type {P} */ ({}), {
				direction
			}));
		});
	}

	/** @type {TransitionManager} */
	var transition = {
		is_global,
		in() {
			element.inert = inert;

			{
				// if we intro then outro then intro again, we want to abort the first intro,
				// if it's not a bidirectional transition
				intro?.abort();
			}

			intro = animate(
				element,
				get_options(),
				outro,
				1,
				() => {
					dispatch_event(element, 'introstart');
				},
				() => {
					dispatch_event(element, 'introend');

					// Ensure we cancel the animation to prevent leaking
					intro?.abort();
					intro = current_options = undefined;

					element.style.overflow = overflow;
				}
			);
		},
		out(fn) {
			{
				fn?.();
				current_options = undefined;
				return;
			}
		},
		stop: () => {
			intro?.abort();
		}
	};

	var e = /** @type {Effect & { nodes: EffectNodes }} */ (active_effect);

	(e.nodes.t ??= []).push(transition);

	// if this is a local transition, we only want to run it if the parent (branch) effect's
	// parent (block) effect is where the state change happened. we can determine that by
	// looking at whether the block effect is currently initializing
	if (should_intro) {
		var run = is_global;

		if (!run) {
			var block = /** @type {Effect | null} */ (e.parent);

			// skip over transparent blocks (e.g. snippets, else-if blocks)
			while (block && (block.f & EFFECT_TRANSPARENT) !== 0) {
				while ((block = block.parent)) {
					if ((block.f & BLOCK_EFFECT) !== 0) break;
				}
			}

			run = !block || (block.f & REACTION_RAN) !== 0;
		}

		if (run) {
			effect(() => {
				untrack(() => transition.in());
			});
		}
	}
}

/**
 * Animates an element, according to the provided configuration
 * @param {Element} element
 * @param {AnimationConfig | ((opts: { direction: 'in' | 'out' }) => AnimationConfig)} options
 * @param {Animation | undefined} counterpart The corresponding intro/outro to this outro/intro
 * @param {number} t2 The target `t` value — `1` for intro, `0` for outro
 * @param {(() => void)} on_begin Called just before beginning the animation
 * @param {(() => void)} on_finish Called after successfully completing the animation
 * @returns {Animation}
 */
function animate(element, options, counterpart, t2, on_begin, on_finish) {
	var aborted = false;

	if (is_function(options)) {
		// In the case of a deferred transition (such as `crossfade`), `option` will be
		// a function rather than an `AnimationConfig`. We need to call this function
		// once the DOM has been updated...
		/** @type {Animation} */
		var a;

		queue_micro_task(() => {
			if (aborted) return;
			var o = options({ direction: 'in'  });
			a = animate(element, o, counterpart, t2, on_begin, on_finish);
		});

		// ...but we want to do so without using `async`/`await` everywhere, so
		// we return a facade that allows everything to remain synchronous
		return {
			abort: () => {
				aborted = true;
				a?.abort();
			},
			deactivate: () => a?.deactivate(),
			reset: () => a?.reset(),
			t: () => a?.t() ?? 1 - t2
		};
	}

	if (!options?.duration && !options?.delay) {
		on_begin();
		on_finish();

		return {
			abort: noop,
			deactivate: noop,
			reset: noop,
			t: () => t2
		};
	}

	const { delay = 0, css, tick, easing = linear$1 } = options;

	/** @type {globalThis.Animation} */
	var animation;

	var get_t = () => 1 - t2;

	// wait a microtask before applying the initial styles and creating the dummy animation,
	// so that transitions created in the same batch (e.g. on nested elements) all measure
	// the DOM first (#18421). this still happens before the next paint, so the element
	// won't be rendered without styles applied (#14732)
	queue_micro_task(() => {
		if (aborted) return;

		var keyframes = [];

		{
			if (tick) {
				tick(0, 1); // TODO put in nested effect, to avoid interleaved reads/writes?
			}

			if (css) {
				var styles = css_to_keyframe(css(0, 1));
				keyframes.push(styles, styles);
			}
		}

		// create a dummy animation that lasts as long as the delay (but with whatever devtools
		// multiplier is in effect). in the common case that it is `0`, we keep it anyway so that
		// the CSS keyframes aren't created until the DOM is updated
		//
		// fill forwards to prevent the element from rendering without styles applied
		// see https://github.com/sveltejs/svelte/issues/14732
		animation = element.animate(keyframes, { duration: delay, fill: 'forwards' });

		animation.onfinish = () => {
			// remove dummy animation from the stack to prevent conflict with main animation
			animation.cancel();

			on_begin();

			// for bidirectional transitions, we start from the current position,
			// rather than doing a full intro/outro
			var t1 = 1 - t2;

			var delta = t2 - t1;
			var duration = /** @type {number} */ (options.duration) * Math.abs(delta);
			var keyframes = [];

			if (duration > 0) {
				/**
				 * Whether or not the CSS includes `overflow: hidden`, in which case we need to
				 * add it as an inline style to work around a Safari <18 bug
				 * TODO 6.0 remove this, if possible
				 */
				var needs_overflow_hidden = false;

				if (css) {
					var n = Math.ceil(duration / (1000 / 60)); // `n` must be an integer, or we risk missing the `t2` value

					for (var i = 0; i <= n; i += 1) {
						var t = t1 + delta * easing(i / n);
						var styles = css_to_keyframe(css(t, 1 - t));
						keyframes.push(styles);

						needs_overflow_hidden ||= styles.overflow === 'hidden';
					}
				}

				if (needs_overflow_hidden) {
					/** @type {HTMLElement} */ (element).style.overflow = 'hidden';
				}

				get_t = () => {
					var time = /** @type {number} */ (
						/** @type {globalThis.Animation} */ (animation).currentTime
					);

					return t1 + delta * easing(time / duration);
				};

				if (tick) {
					loop(() => {
						if (animation.playState !== 'running') return false;

						var t = get_t();
						tick(t, 1 - t);

						return true;
					});
				}
			}

			animation = element.animate(keyframes, { duration, fill: 'forwards' });

			animation.onfinish = () => {
				get_t = () => t2;
				tick?.(t2, 1 - t2);
				on_finish();
			};
		};
	});

	return {
		abort: () => {
			aborted = true;

			if (animation) {
				animation.cancel();
				// This prevents memory leaks in Chromium
				animation.effect = null;
				// This prevents onfinish to be launched after cancel(),
				// which can happen in some rare cases
				// see https://github.com/sveltejs/svelte/issues/13681
				animation.onfinish = noop;
			}
		},
		deactivate: () => {
			on_finish = noop;
		},
		reset: () => {
		},
		t: () => get_t()
	};
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

/**
 * Sets the `selected` attribute on an option so form reset can restore it.
 * @param {HTMLOptionElement} option
 * @param {boolean} selected
 */
function set_selected(option, selected) {
	if (selected) {
		if (!option.hasAttribute('selected')) option.setAttribute('selected', '');
	} else {
		option.removeAttribute('selected');
	}
}

/**
 * Marks the options matching `__defaultValue` as selected. Without `preserve`
 * a newly matching option gets selected, as an inserted `<option selected>` would.
 * @param {HTMLSelectElement} select
 * @param {boolean} preserve
 */
function apply_default_select_value(select, preserve) {
	// @ts-expect-error
	var value = select.__defaultValue;
	var multiple = select.multiple;
	var values = multiple ? value ?? [] : null;

	if (multiple && !is_array(values)) return;

	select.selectedIndex;

	for (var option of select.options) {
		var option_value = get_option_value(option);
		set_selected(
			option,
			multiple ? /** @type {any[]} */ (values).includes(option_value) : is(option_value, value)
		);
	}

	return;
}

/**
 * Selects the correct option(s) (depending on whether this is a multiple select)
 * @template V
 * @param {HTMLSelectElement} select
 * @param {V} value
 * @param {boolean} mounting
 */
function select_option(select, value, mounting = false) {
	if (select.multiple) {
		// If value is null or undefined, keep the selection as is
		if (value == undefined) {
			return;
		}

		// If not an array, warn and keep the selection as is
		if (!is_array(value)) {
			return select_multiple_invalid_value();
		}

		// Otherwise, update the selection
		for (var option of select.options) {
			option.selected = value.includes(get_option_value(option));
		}

		return;
	}

	for (option of select.options) {
		var option_value = get_option_value(option);
		if (is(option_value, value)) {
			option.selected = true;
			return;
		}
	}

	if (!mounting || value !== undefined) {
		select.selectedIndex = -1; // no option should be selected
	}
}

/**
 * Sets up a mutation observer to sync the current selection
 * and default to the dom when the options change, for example
 * when they are inside an `#each` block. Called once per `<select>`,
 * by the compiled output or by `attribute_effect` for spreads.
 * @param {HTMLSelectElement} select
 */
function init_select(select) {
	var observer = new MutationObserver((entries) => {
		// Mutations related to `<selectedcontent>` can never affect the option list.
		// Reacting to them could revert a user-initiated selection change, because the
		// records are delivered as soon as any listener returns (e.g. a delegated `input`
		// handler), which can happen before the `change` handler has updated `__value`
		if (entries.every(is_selectedcontent_mutation)) return;

		if ('__defaultValue' in select) {
			apply_default_select_value(select);
		}

		if ('__value' in select) {
			select_option(select, select.__value);
		}
		// Deliberately don't update the potential binding value,
		// the model should be preserved unless explicitly changed
	});

	observer.observe(select, {
		// Listen to option element changes
		childList: true,
		subtree: true, // because of <optgroup>
		// Listen to option element value attribute changes
		// (doesn't get notified of select value changes,
		// because that property is not reflected as an attribute)
		attributes: true,
		attributeFilter: ['value']
	});

	teardown(() => {
		observer.disconnect();
	});
}

/** @param {HTMLOptionElement} option */
function get_option_value(option) {
	// __value only exists if the <option> has a value attribute
	if ('__value' in option) {
		return option.__value;
	} else {
		return option.value;
	}
}

/**
 * Returns `true` if the mutation stems from the browser mirroring the selected
 * option's content into `<selectedcontent>`, or from us replacing the
 * `<selectedcontent>` element with a clone of itself
 * @param {MutationRecord} entry
 */
function is_selectedcontent_mutation(entry) {
	if (/** @type {Element} */ (entry.target).closest('selectedcontent') !== null) {
		return true;
	}

	if (entry.type === 'childList') {
		var nodes = [...entry.addedNodes, ...entry.removedNodes];
		return nodes.length > 0 && nodes.every((node) => node.nodeName === 'SELECTEDCONTENT');
	}

	return false;
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

/**
 * We create one listener for all elements
 * @see {@link https://groups.google.com/a/chromium.org/g/blink-dev/c/z6ienONUb5A/m/F5-VcUZtBAAJ Explanation}
 */
class ResizeObserverSingleton {
	/** */
	#listeners = new WeakMap();

	/** @type {ResizeObserver | undefined} */
	#observer;

	/** @type {ResizeObserverOptions} */
	#options;

	/** @static */
	static entries = new WeakMap();

	/** @param {ResizeObserverOptions} options */
	constructor(options) {
		this.#options = options;
	}

	/**
	 * @param {Element} element
	 * @param {(entry: ResizeObserverEntry) => any} listener
	 */
	observe(element, listener) {
		var listeners = this.#listeners.get(element) || new Set();
		listeners.add(listener);

		this.#listeners.set(element, listeners);
		this.#getObserver().observe(element, this.#options);

		return () => {
			var listeners = this.#listeners.get(element);
			listeners.delete(listener);

			if (listeners.size === 0) {
				this.#listeners.delete(element);
				/** @type {ResizeObserver} */ (this.#observer).unobserve(element);
			}
		};
	}

	#getObserver() {
		return (
			this.#observer ??
			(this.#observer = new ResizeObserver(
				/** @param {any} entries */ (entries) => {
					for (var entry of entries) {
						ResizeObserverSingleton.entries.set(entry.target, entry);
						for (var listener of this.#listeners.get(entry.target) || []) {
							listener(entry);
						}
					}
				}
			))
		);
	}
}

var resize_observer_border_box = /* @__PURE__ */ new ResizeObserverSingleton({
	box: 'border-box'
});

/**
 * @param {HTMLElement} element
 * @param {'clientWidth' | 'clientHeight' | 'offsetWidth' | 'offsetHeight'} type
 * @param {(size: number) => void} set
 */
function bind_element_size(element, type, set) {
	var unsub = resize_observer_border_box.observe(element, () => set(element[type]));

	effect(() => {
		// The update could contain reads which should be ignored
		untrack(() => set(element[type]));
		return unsub;
	});
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

	var fallback_value = /** @type {V} */ (fallback);
	var fallback_dirty = true;

	var get_fallback = () => {

		if (fallback_dirty) {
			fallback_dirty = false;

			fallback_value = /** @type {V} */ (fallback);
		}

		return fallback_value;
	};

	/** @type {V} */
	var initial_value;

	{
		initial_value = /** @type {V} */ (props[key]);
	}

	if (initial_value === undefined && fallback !== undefined) {
		initial_value = get_fallback();
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
	{
		return getter;
	}
}

const TRANSITIONS = [
  { value: "none", label: "Keiner" },
  { value: "fade", label: "Überblenden" },
  { value: "slide", label: "Schieben" },
  { value: "zoom", label: "Zoom" },
  { value: "wipe", label: "Wischen" },
  { value: "crosswarp", label: "Warp", gpu: true },
  { value: "directionalwarp", label: "Warp ↗", gpu: true },
  { value: "morph", label: "Morph", gpu: true },
  { value: "pixelize", label: "Pixel", gpu: true },
  { value: "dreamy", label: "Traum", gpu: true },
  { value: "windowslice", label: "Streifen", gpu: true },
  { value: "ripple", label: "Welle", gpu: true },
  { value: "swirl", label: "Wirbel", gpu: true },
  { value: "crosshatch", label: "Schraffur", gpu: true },
  { value: "wind", label: "Wind", gpu: true },
  { value: "iris", label: "Iris", gpu: true },
  { value: "polka", label: "Punkte", gpu: true }
];
const FILL_MODES = [
  { value: "cover", label: "Füllen" },
  { value: "contain", label: "Einpassen" },
  { value: "stretch", label: "Strecken" },
  { value: "center", label: "Zentriert" },
  { value: "tile", label: "Kacheln" }
];
const MEDIA_TABS = [
  { value: "all", label: "Alle" },
  { value: "image", label: "Bilder" },
  { value: "video", label: "Videos" },
  { value: "we", label: "Wallpaper Engine" }
];
const RECOLOUR_PALETTES = [
  { value: "theme", label: "App-Theme", colors: [] },
  // uses the live theme palette
  {
    value: "catppuccin",
    label: "Catppuccin",
    colors: ["#1e1e2e", "#313244", "#45475a", "#cdd6f4", "#f5c2e7", "#cba6f7", "#89b4fa", "#94e2d5", "#a6e3a1", "#f9e2af", "#fab387", "#f38ba8"]
  },
  {
    value: "gruvbox",
    label: "Gruvbox",
    colors: ["#282828", "#3c3836", "#504945", "#ebdbb2", "#fb4934", "#b8bb26", "#fabd2f", "#83a598", "#d3869b", "#8ec07c", "#fe8019", "#d65d0e"]
  },
  {
    value: "nord",
    label: "Nord",
    colors: ["#2e3440", "#3b4252", "#434c5e", "#eceff4", "#88c0d0", "#81a1c1", "#5e81ac", "#8fbcbb", "#a3be8c", "#ebcb8b", "#d08770", "#bf616a"]
  }
];
const SORTS = [
  { value: "newest", label: "Neueste" },
  { value: "oldest", label: "Älteste" },
  { value: "name", label: "Name A–Z" },
  { value: "nameDesc", label: "Name Z–A" },
  { value: "rainbow", label: "Regenbogen" },
  { value: "color", label: "Farbe hell→dunkel" },
  { value: "colorDark", label: "Farbe dunkel→hell" },
  { value: "favorites", label: "Favoriten zuerst" },
  { value: "shuffle", label: "Zufällig" }
];
const COLOR_FAMILIES = [
  { key: "red", label: "Rot", swatch: "#e5484d" },
  { key: "orange", label: "Orange", swatch: "#f76b15" },
  { key: "yellow", label: "Gelb", swatch: "#f5d90a" },
  { key: "green", label: "Grün", swatch: "#46a758" },
  { key: "teal", label: "Türkis", swatch: "#12a594" },
  { key: "blue", label: "Blau", swatch: "#3e63dd" },
  { key: "purple", label: "Lila", swatch: "#8e4ec6" },
  { key: "pink", label: "Pink", swatch: "#e93d82" },
  { key: "mono", label: "Grau", swatch: "#8b8d98" }
];
const DEFAULT_STATE = {
  items: [],
  activeId: null,
  viewMode: "wall",
  menuSide: "right",
  menuMode: "auto",
  autoHideMs: 2500,
  dim: 0.35,
  schemeCharacter: "vibrant",
  finish: "natural",
  paletteBehaviour: "follow",
  fixedSeed: "#ff6b35",
  themeContrast: 0,
  themePresets: [],
  uiScale: 1,
  setHome: true,
  setLock: true,
  fillMode: "cover",
  tileSize: 130,
  tileRadius: 10,
  randomEnabled: false,
  randomIntervalSec: 300,
  randomFavOnly: false,
  randomSetHome: false,
  randomSetLock: false,
  transitionType: "fade",
  transitionMs: 600,
  deviceMobile: false,
  liveWallpaper: false,
  collections: [],
  activeCollectionId: null,
  scheduleEnabled: false,
  schedule: [],
  wallColumns: 0,
  slicesSkew: 9,
  slicesHeight: 7,
  hexSize: 0,
  hexRows: 3,
  hexColumns: 3,
  hexScrollStep: 1,
  hexArc: true,
  hexArcIntensity: 12,
  hexOffsetX: 0,
  hexFadeStart: 70,
  sandySide: "left",
  handOffsetX: 0,
  slicesFeatured: true,
  depthTilt: 8,
  handSpread: 7,
  geometryPresets: [null, null, null, null],
  muteVideo: true,
  videoVolume: 100,
  autoRecolour: false,
  recolourPalette: "theme",
  closeOnSelection: false,
  alwaysFilterBar: false,
  alwaysSearchBar: false,
  includeImages: true,
  includeVideos: true,
  sourceColourIndex: 0,
  randomShader: false,
  whColumns: 3,
  whApiKey: "",
  folders: [],
  trashedItems: [],
  trashRetentionDays: 30,
  trashAutoDelete: false,
  aiEnabled: false,
  aiEndpoint: "http://localhost:11434",
  aiModel: "",
  aiApiKey: "",
  wallpaperDir: "",
  videoDir: ""
};
const VIEW_MODES = [
  { value: "slices", label: "Slices", icon: "rows" },
  { value: "depth", label: "Depth", icon: "grid" },
  { value: "geometric", label: "Geometric", icon: "hexagon" },
  { value: "wall", label: "Wall", icon: "grid" },
  { value: "sandy", label: "Sandy", icon: "image" },
  { value: "hand", label: "Card hand", icon: "rows" },
  { value: "collection", label: "Collection", icon: "grid" }
];

const EFFECTS = [
  { value: "none", label: "Original" },
  { value: "recolor", label: "Umfärben" },
  { value: "grayscale", label: "Graustufen" },
  { value: "sepia", label: "Sepia" },
  { value: "posterize", label: "Poster" },
  { value: "invert", label: "Invertiert" }
];
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function loadImage$1(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function applyEffect(srcUrl, effect, paletteHex = []) {
  const img = await loadImage$1(srcUrl);
  const maxDim = 3840;
  const s = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d");
  ctx.drawImage(img, 0, 0, w, h);
  if (effect !== "none") {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const pal = paletteHex.map(hexToRgb);
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      if (effect === "grayscale") {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = y;
      } else if (effect === "sepia") {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = Math.min(255, tr);
        g = Math.min(255, tg);
        b = Math.min(255, tb);
      } else if (effect === "invert") {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      } else if (effect === "posterize") {
        const n = 4;
        r = Math.round(r / 255 * n) * (255 / n);
        g = Math.round(g / 255 * n) * (255 / n);
        b = Math.round(b / 255 * n) * (255 / n);
      } else if (effect === "recolor" && pal.length) {
        let best = pal[0];
        let bd = Infinity;
        for (const c of pal) {
          const dr = r - c[0];
          const dg = g - c[1];
          const db = b - c[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bd) {
            bd = dist;
            best = c;
          }
        }
        r = best[0];
        g = best[1];
        b = best[2];
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return new Promise(
    (resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob")), "image/jpeg", 0.92)
  );
}

const DB_NAME = "sojus-wallpapers";
const STORE = "images";
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, mode).objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putImage(id, blob) {
  await tx("readwrite", (s) => s.put(blob, id));
}
async function getImage(id) {
  return tx("readonly", (s) => s.get(id));
}
async function deleteImage(id) {
  await tx("readwrite", (s) => s.delete(id));
}
async function clearAllImages() {
  await tx("readwrite", (s) => s.clear());
}
async function imageUrl(id) {
  const blob = await getImage(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// This file is automatically generated. Do not modify it.
/**
 * Utility methods for mathematical operations.
 */
/**
 * The signum function.
 *
 * @return 1 if num > 0, -1 if num < 0, and 0 if num = 0
 */
function signum(num) {
    if (num < 0) {
        return -1;
    }
    else if (num === 0) {
        return 0;
    }
    else {
        return 1;
    }
}
/**
 * The linear interpolation function.
 *
 * @return start if amount = 0 and stop if amount = 1
 */
function lerp(start, stop, amount) {
    return (1.0 - amount) * start + amount * stop;
}
/**
 * Clamps an integer between two integers.
 *
 * @return input when min <= input <= max, and either min or max
 * otherwise.
 */
function clampInt(min, max, input) {
    if (input < min) {
        return min;
    }
    else if (input > max) {
        return max;
    }
    return input;
}
/**
 * Clamps an integer between two floating-point numbers.
 *
 * @return input when min <= input <= max, and either min or max
 * otherwise.
 */
function clampDouble(min, max, input) {
    if (input < min) {
        return min;
    }
    else if (input > max) {
        return max;
    }
    return input;
}
/**
 * Sanitizes a degree measure as an integer.
 *
 * @return a degree measure between 0 (inclusive) and 360
 * (exclusive).
 */
function sanitizeDegreesInt(degrees) {
    degrees = degrees % 360;
    if (degrees < 0) {
        degrees = degrees + 360;
    }
    return degrees;
}
/**
 * Sanitizes a degree measure as a floating-point number.
 *
 * @return a degree measure between 0.0 (inclusive) and 360.0
 * (exclusive).
 */
function sanitizeDegreesDouble(degrees) {
    degrees = degrees % 360.0;
    if (degrees < 0) {
        degrees = degrees + 360.0;
    }
    return degrees;
}
/**
 * Distance of two points on a circle, represented using degrees.
 */
function differenceDegrees(a, b) {
    return 180.0 - Math.abs(Math.abs(a - b) - 180.0);
}
/**
 * Multiplies a 1x3 row vector with a 3x3 matrix.
 */
function matrixMultiply(row, matrix) {
    const a = row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2];
    const b = row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2];
    const c = row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2];
    return [a, b, c];
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// This file is automatically generated. Do not modify it.
/**
 * Color science utilities.
 *
 * Utility methods for color science constants and color space
 * conversions that aren't HCT or CAM16.
 */
const SRGB_TO_XYZ = [
    [0.41233895, 0.35762064, 0.18051042],
    [0.2126, 0.7152, 0.0722],
    [0.01932141, 0.11916382, 0.95034478],
];
const XYZ_TO_SRGB = [
    [
        3.2413774792388685,
        -1.5376652402851851,
        -0.49885366846268053,
    ],
    [
        -0.9691452513005321,
        1.8758853451067872,
        0.04156585616912061,
    ],
    [
        0.05562093689691305,
        -0.20395524564742123,
        1.0571799111220335,
    ],
];
const WHITE_POINT_D65 = [95.047, 100.0, 108.883];
/**
 * Converts a color from RGB components to ARGB format.
 */
function argbFromRgb(red, green, blue) {
    return (255 << 24 | (red & 255) << 16 | (green & 255) << 8 | blue & 255) >>>
        0;
}
/**
 * Converts a color from linear RGB components to ARGB format.
 */
function argbFromLinrgb(linrgb) {
    const r = delinearized(linrgb[0]);
    const g = delinearized(linrgb[1]);
    const b = delinearized(linrgb[2]);
    return argbFromRgb(r, g, b);
}
/**
 * Returns the alpha component of a color in ARGB format.
 */
function alphaFromArgb(argb) {
    return argb >> 24 & 255;
}
/**
 * Returns the red component of a color in ARGB format.
 */
function redFromArgb(argb) {
    return argb >> 16 & 255;
}
/**
 * Returns the green component of a color in ARGB format.
 */
function greenFromArgb(argb) {
    return argb >> 8 & 255;
}
/**
 * Returns the blue component of a color in ARGB format.
 */
function blueFromArgb(argb) {
    return argb & 255;
}
/**
 * Converts a color from ARGB to XYZ.
 */
function argbFromXyz(x, y, z) {
    const matrix = XYZ_TO_SRGB;
    const linearR = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z;
    const linearG = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z;
    const linearB = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z;
    const r = delinearized(linearR);
    const g = delinearized(linearG);
    const b = delinearized(linearB);
    return argbFromRgb(r, g, b);
}
/**
 * Converts a color from XYZ to ARGB.
 */
function xyzFromArgb(argb) {
    const r = linearized(redFromArgb(argb));
    const g = linearized(greenFromArgb(argb));
    const b = linearized(blueFromArgb(argb));
    return matrixMultiply([r, g, b], SRGB_TO_XYZ);
}
/**
 * Converts a color represented in Lab color space into an ARGB
 * integer.
 */
function argbFromLab(l, a, b) {
    const whitePoint = WHITE_POINT_D65;
    const fy = (l + 16.0) / 116.0;
    const fx = a / 500.0 + fy;
    const fz = fy - b / 200.0;
    const xNormalized = labInvf(fx);
    const yNormalized = labInvf(fy);
    const zNormalized = labInvf(fz);
    const x = xNormalized * whitePoint[0];
    const y = yNormalized * whitePoint[1];
    const z = zNormalized * whitePoint[2];
    return argbFromXyz(x, y, z);
}
/**
 * Converts a color from ARGB representation to L*a*b*
 * representation.
 *
 * @param argb the ARGB representation of a color
 * @return a Lab object representing the color
 */
function labFromArgb(argb) {
    const linearR = linearized(redFromArgb(argb));
    const linearG = linearized(greenFromArgb(argb));
    const linearB = linearized(blueFromArgb(argb));
    const matrix = SRGB_TO_XYZ;
    const x = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
    const y = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
    const z = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;
    const whitePoint = WHITE_POINT_D65;
    const xNormalized = x / whitePoint[0];
    const yNormalized = y / whitePoint[1];
    const zNormalized = z / whitePoint[2];
    const fx = labF(xNormalized);
    const fy = labF(yNormalized);
    const fz = labF(zNormalized);
    const l = 116.0 * fy - 16;
    const a = 500.0 * (fx - fy);
    const b = 200.0 * (fy - fz);
    return [l, a, b];
}
/**
 * Converts an L* value to an ARGB representation.
 *
 * @param lstar L* in L*a*b*
 * @return ARGB representation of grayscale color with lightness
 * matching L*
 */
function argbFromLstar(lstar) {
    const y = yFromLstar(lstar);
    const component = delinearized(y);
    return argbFromRgb(component, component, component);
}
/**
 * Computes the L* value of a color in ARGB representation.
 *
 * @param argb ARGB representation of a color
 * @return L*, from L*a*b*, coordinate of the color
 */
function lstarFromArgb(argb) {
    const y = xyzFromArgb(argb)[1];
    return 116.0 * labF(y / 100.0) - 16.0;
}
/**
 * Converts an L* value to a Y value.
 *
 * L* in L*a*b* and Y in XYZ measure the same quantity, luminance.
 *
 * L* measures perceptual luminance, a linear scale. Y in XYZ
 * measures relative luminance, a logarithmic scale.
 *
 * @param lstar L* in L*a*b*
 * @return Y in XYZ
 */
function yFromLstar(lstar) {
    return 100.0 * labInvf((lstar + 16.0) / 116.0);
}
/**
 * Converts a Y value to an L* value.
 *
 * L* in L*a*b* and Y in XYZ measure the same quantity, luminance.
 *
 * L* measures perceptual luminance, a linear scale. Y in XYZ
 * measures relative luminance, a logarithmic scale.
 *
 * @param y Y in XYZ
 * @return L* in L*a*b*
 */
function lstarFromY(y) {
    return labF(y / 100.0) * 116.0 - 16.0;
}
/**
 * Linearizes an RGB component.
 *
 * @param rgbComponent 0 <= rgb_component <= 255, represents R/G/B
 * channel
 * @return 0.0 <= output <= 100.0, color channel converted to
 * linear RGB space
 */
function linearized(rgbComponent) {
    const normalized = rgbComponent / 255.0;
    if (normalized <= 0.040449936) {
        return normalized / 12.92 * 100.0;
    }
    else {
        return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
    }
}
/**
 * Delinearizes an RGB component.
 *
 * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
 * linear R/G/B channel
 * @return 0 <= output <= 255, color channel converted to regular
 * RGB space
 */
function delinearized(rgbComponent) {
    const normalized = rgbComponent / 100.0;
    let delinearized = 0.0;
    if (normalized <= 0.0031308) {
        delinearized = normalized * 12.92;
    }
    else {
        delinearized = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
    }
    return clampInt(0, 255, Math.round(delinearized * 255.0));
}
/**
 * Returns the standard white point; white on a sunny day.
 *
 * @return The white point
 */
function whitePointD65() {
    return WHITE_POINT_D65;
}
function labF(t) {
    const e = 216.0 / 24389.0;
    const kappa = 24389.0 / 27.0;
    if (t > e) {
        return Math.pow(t, 1.0 / 3.0);
    }
    else {
        return (kappa * t + 16) / 116;
    }
}
function labInvf(ft) {
    const e = 216.0 / 24389.0;
    const kappa = 24389.0 / 27.0;
    const ft3 = ft * ft * ft;
    if (ft3 > e) {
        return ft3;
    }
    else {
        return (116 * ft - 16) / kappa;
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * In traditional color spaces, a color can be identified solely by the
 * observer's measurement of the color. Color appearance models such as CAM16
 * also use information about the environment where the color was
 * observed, known as the viewing conditions.
 *
 * For example, white under the traditional assumption of a midday sun white
 * point is accurately measured as a slightly chromatic blue by CAM16. (roughly,
 * hue 203, chroma 3, lightness 100)
 *
 * This class caches intermediate values of the CAM16 conversion process that
 * depend only on viewing conditions, enabling speed ups.
 */
class ViewingConditions {
    /**
     * Create ViewingConditions from a simple, physically relevant, set of
     * parameters.
     *
     * @param whitePoint White point, measured in the XYZ color space.
     *     default = D65, or sunny day afternoon
     * @param adaptingLuminance The luminance of the adapting field. Informally,
     *     how bright it is in the room where the color is viewed. Can be
     *     calculated from lux by multiplying lux by 0.0586. default = 11.72,
     *     or 200 lux.
     * @param backgroundLstar The lightness of the area surrounding the color.
     *     measured by L* in L*a*b*. default = 50.0
     * @param surround A general description of the lighting surrounding the
     *     color. 0 is pitch dark, like watching a movie in a theater. 1.0 is a
     *     dimly light room, like watching TV at home at night. 2.0 means there
     *     is no difference between the lighting on the color and around it.
     *     default = 2.0
     * @param discountingIlluminant Whether the eye accounts for the tint of the
     *     ambient lighting, such as knowing an apple is still red in green light.
     *     default = false, the eye does not perform this process on
     *       self-luminous objects like displays.
     */
    static make(whitePoint = whitePointD65(), adaptingLuminance = (200.0 / Math.PI) * yFromLstar(50.0) / 100.0, backgroundLstar = 50.0, surround = 2.0, discountingIlluminant = false) {
        const xyz = whitePoint;
        const rW = xyz[0] * 0.401288 + xyz[1] * 0.650173 + xyz[2] * -0.051461;
        const gW = xyz[0] * -0.250268 + xyz[1] * 1.204414 + xyz[2] * 0.045854;
        const bW = xyz[0] * -2079e-6 + xyz[1] * 0.048952 + xyz[2] * 0.953127;
        const f = 0.8 + surround / 10.0;
        const c = f >= 0.9 ? lerp(0.59, 0.69, (f - 0.9) * 10.0) :
            lerp(0.525, 0.59, (f - 0.8) * 10.0);
        let d = discountingIlluminant ?
            1.0 :
            f * (1.0 - (1.0 / 3.6) * Math.exp((-adaptingLuminance - 42.0) / 92.0));
        d = d > 1.0 ? 1.0 : d < 0.0 ? 0.0 : d;
        const nc = f;
        const rgbD = [
            d * (100.0 / rW) + 1.0 - d,
            d * (100.0 / gW) + 1.0 - d,
            d * (100.0 / bW) + 1.0 - d,
        ];
        const k = 1.0 / (5.0 * adaptingLuminance + 1.0);
        const k4 = k * k * k * k;
        const k4F = 1.0 - k4;
        const fl = k4 * adaptingLuminance +
            0.1 * k4F * k4F * Math.cbrt(5.0 * adaptingLuminance);
        const n = yFromLstar(backgroundLstar) / whitePoint[1];
        const z = 1.48 + Math.sqrt(n);
        const nbb = 0.725 / Math.pow(n, 0.2);
        const ncb = nbb;
        const rgbAFactors = [
            Math.pow((fl * rgbD[0] * rW) / 100.0, 0.42),
            Math.pow((fl * rgbD[1] * gW) / 100.0, 0.42),
            Math.pow((fl * rgbD[2] * bW) / 100.0, 0.42),
        ];
        const rgbA = [
            (400.0 * rgbAFactors[0]) / (rgbAFactors[0] + 27.13),
            (400.0 * rgbAFactors[1]) / (rgbAFactors[1] + 27.13),
            (400.0 * rgbAFactors[2]) / (rgbAFactors[2] + 27.13),
        ];
        const aw = (2.0 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;
        return new ViewingConditions(n, aw, nbb, ncb, c, nc, rgbD, fl, Math.pow(fl, 0.25), z);
    }
    /**
     * Parameters are intermediate values of the CAM16 conversion process. Their
     * names are shorthand for technical color science terminology, this class
     * would not benefit from documenting them individually. A brief overview
     * is available in the CAM16 specification, and a complete overview requires
     * a color science textbook, such as Fairchild's Color Appearance Models.
     */
    constructor(n, aw, nbb, ncb, c, nc, rgbD, fl, fLRoot, z) {
        this.n = n;
        this.aw = aw;
        this.nbb = nbb;
        this.ncb = ncb;
        this.c = c;
        this.nc = nc;
        this.rgbD = rgbD;
        this.fl = fl;
        this.fLRoot = fLRoot;
        this.z = z;
    }
}
/** sRGB-like viewing conditions.  */
ViewingConditions.DEFAULT = ViewingConditions.make();

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * CAM16, a color appearance model. Colors are not just defined by their hex
 * code, but rather, a hex code and viewing conditions.
 *
 * CAM16 instances also have coordinates in the CAM16-UCS space, called J*, a*,
 * b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
 * specification, and should be used when measuring distances between colors.
 *
 * In traditional color spaces, a color can be identified solely by the
 * observer's measurement of the color. Color appearance models such as CAM16
 * also use information about the environment where the color was
 * observed, known as the viewing conditions.
 *
 * For example, white under the traditional assumption of a midday sun white
 * point is accurately measured as a slightly chromatic blue by CAM16. (roughly,
 * hue 203, chroma 3, lightness 100)
 */
class Cam16 {
    /**
     * All of the CAM16 dimensions can be calculated from 3 of the dimensions, in
     * the following combinations:
     *      -  {j or q} and {c, m, or s} and hue
     *      - jstar, astar, bstar
     * Prefer using a static method that constructs from 3 of those dimensions.
     * This constructor is intended for those methods to use to return all
     * possible dimensions.
     *
     * @param hue
     * @param chroma informally, colorfulness / color intensity. like saturation
     *     in HSL, except perceptually accurate.
     * @param j lightness
     * @param q brightness; ratio of lightness to white point's lightness
     * @param m colorfulness
     * @param s saturation; ratio of chroma to white point's chroma
     * @param jstar CAM16-UCS J coordinate
     * @param astar CAM16-UCS a coordinate
     * @param bstar CAM16-UCS b coordinate
     */
    constructor(hue, chroma, j, q, m, s, jstar, astar, bstar) {
        this.hue = hue;
        this.chroma = chroma;
        this.j = j;
        this.q = q;
        this.m = m;
        this.s = s;
        this.jstar = jstar;
        this.astar = astar;
        this.bstar = bstar;
    }
    /**
     * CAM16 instances also have coordinates in the CAM16-UCS space, called J*,
     * a*, b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
     * specification, and is used to measure distances between colors.
     */
    distance(other) {
        const dJ = this.jstar - other.jstar;
        const dA = this.astar - other.astar;
        const dB = this.bstar - other.bstar;
        const dEPrime = Math.sqrt(dJ * dJ + dA * dA + dB * dB);
        const dE = 1.41 * Math.pow(dEPrime, 0.63);
        return dE;
    }
    /**
     * @param argb ARGB representation of a color.
     * @return CAM16 color, assuming the color was viewed in default viewing
     *     conditions.
     */
    static fromInt(argb) {
        return Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT);
    }
    /**
     * @param argb ARGB representation of a color.
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     * @return CAM16 color.
     */
    static fromIntInViewingConditions(argb, viewingConditions) {
        const red = (argb & 0x00ff0000) >> 16;
        const green = (argb & 0x0000ff00) >> 8;
        const blue = (argb & 0x000000ff);
        const redL = linearized(red);
        const greenL = linearized(green);
        const blueL = linearized(blue);
        const x = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL;
        const y = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL;
        const z = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL;
        const rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
        const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
        const bC = -2079e-6 * x + 0.048952 * y + 0.953127 * z;
        const rD = viewingConditions.rgbD[0] * rC;
        const gD = viewingConditions.rgbD[1] * gC;
        const bD = viewingConditions.rgbD[2] * bC;
        const rAF = Math.pow((viewingConditions.fl * Math.abs(rD)) / 100.0, 0.42);
        const gAF = Math.pow((viewingConditions.fl * Math.abs(gD)) / 100.0, 0.42);
        const bAF = Math.pow((viewingConditions.fl * Math.abs(bD)) / 100.0, 0.42);
        const rA = (signum(rD) * 400.0 * rAF) / (rAF + 27.13);
        const gA = (signum(gD) * 400.0 * gAF) / (gAF + 27.13);
        const bA = (signum(bD) * 400.0 * bAF) / (bAF + 27.13);
        const a = (11.0 * rA + -12 * gA + bA) / 11.0;
        const b = (rA + gA - 2.0 * bA) / 9.0;
        const u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0;
        const p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;
        const atan2 = Math.atan2(b, a);
        const atanDegrees = (atan2 * 180.0) / Math.PI;
        const hue = sanitizeDegreesDouble(atanDegrees);
        const hueRadians = (hue * Math.PI) / 180.0;
        const ac = p2 * viewingConditions.nbb;
        const j = 100.0 *
            Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
        const q = (4.0 / viewingConditions.c) * Math.sqrt(j / 100.0) *
            (viewingConditions.aw + 4.0) * viewingConditions.fLRoot;
        const huePrime = hue < 20.14 ? hue + 360 : hue;
        const eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180.0 + 2.0) + 3.8);
        const p1 = (50000.0 / 13.0) * eHue * viewingConditions.nc * viewingConditions.ncb;
        const t = (p1 * Math.sqrt(a * a + b * b)) / (u + 0.305);
        const alpha = Math.pow(t, 0.9) *
            Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        const c = alpha * Math.sqrt(j / 100.0);
        const m = c * viewingConditions.fLRoot;
        const s = 50.0 *
            Math.sqrt((alpha * viewingConditions.c) / (viewingConditions.aw + 4.0));
        const jstar = ((1.0 + 100.0 * 0.007) * j) / (1.0 + 0.007 * j);
        const mstar = (1.0 / 0.0228) * Math.log(1.0 + 0.0228 * m);
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new Cam16(hue, c, j, q, m, s, jstar, astar, bstar);
    }
    /**
     * @param j CAM16 lightness
     * @param c CAM16 chroma
     * @param h CAM16 hue
     */
    static fromJch(j, c, h) {
        return Cam16.fromJchInViewingConditions(j, c, h, ViewingConditions.DEFAULT);
    }
    /**
     * @param j CAM16 lightness
     * @param c CAM16 chroma
     * @param h CAM16 hue
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     */
    static fromJchInViewingConditions(j, c, h, viewingConditions) {
        const q = (4.0 / viewingConditions.c) * Math.sqrt(j / 100.0) *
            (viewingConditions.aw + 4.0) * viewingConditions.fLRoot;
        const m = c * viewingConditions.fLRoot;
        const alpha = c / Math.sqrt(j / 100.0);
        const s = 50.0 *
            Math.sqrt((alpha * viewingConditions.c) / (viewingConditions.aw + 4.0));
        const hueRadians = (h * Math.PI) / 180.0;
        const jstar = ((1.0 + 100.0 * 0.007) * j) / (1.0 + 0.007 * j);
        const mstar = (1.0 / 0.0228) * Math.log(1.0 + 0.0228 * m);
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new Cam16(h, c, j, q, m, s, jstar, astar, bstar);
    }
    /**
     * @param jstar CAM16-UCS lightness.
     * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the Y axis.
     * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the X axis.
     */
    static fromUcs(jstar, astar, bstar) {
        return Cam16.fromUcsInViewingConditions(jstar, astar, bstar, ViewingConditions.DEFAULT);
    }
    /**
     * @param jstar CAM16-UCS lightness.
     * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the Y axis.
     * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the X axis.
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     */
    static fromUcsInViewingConditions(jstar, astar, bstar, viewingConditions) {
        const a = astar;
        const b = bstar;
        const m = Math.sqrt(a * a + b * b);
        const M = (Math.exp(m * 0.0228) - 1.0) / 0.0228;
        const c = M / viewingConditions.fLRoot;
        let h = Math.atan2(b, a) * (180.0 / Math.PI);
        if (h < 0.0) {
            h += 360.0;
        }
        const j = jstar / (1 - (jstar - 100) * 0.007);
        return Cam16.fromJchInViewingConditions(j, c, h, viewingConditions);
    }
    /**
     *  @return ARGB representation of color, assuming the color was viewed in
     *     default viewing conditions, which are near-identical to the default
     *     viewing conditions for sRGB.
     */
    toInt() {
        return this.viewed(ViewingConditions.DEFAULT);
    }
    /**
     * @param viewingConditions Information about the environment where the color
     *     will be viewed.
     * @return ARGB representation of color
     */
    viewed(viewingConditions) {
        const alpha = this.chroma === 0.0 || this.j === 0.0 ?
            0.0 :
            this.chroma / Math.sqrt(this.j / 100.0);
        const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1.0 / 0.9);
        const hRad = (this.hue * Math.PI) / 180.0;
        const eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8);
        const ac = viewingConditions.aw *
            Math.pow(this.j / 100.0, 1.0 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb;
        const p2 = ac / viewingConditions.nbb;
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);
        const gamma = (23.0 * (p2 + 0.305) * t) /
            (23.0 * p1 + 11.0 * t * hCos + 108.0 * t * hSin);
        const a = gamma * hCos;
        const b = gamma * hSin;
        const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
        const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
        const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;
        const rCBase = Math.max(0, (27.13 * Math.abs(rA)) / (400.0 - Math.abs(rA)));
        const rC = signum(rA) * (100.0 / viewingConditions.fl) *
            Math.pow(rCBase, 1.0 / 0.42);
        const gCBase = Math.max(0, (27.13 * Math.abs(gA)) / (400.0 - Math.abs(gA)));
        const gC = signum(gA) * (100.0 / viewingConditions.fl) *
            Math.pow(gCBase, 1.0 / 0.42);
        const bCBase = Math.max(0, (27.13 * Math.abs(bA)) / (400.0 - Math.abs(bA)));
        const bC = signum(bA) * (100.0 / viewingConditions.fl) *
            Math.pow(bCBase, 1.0 / 0.42);
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];
        const x = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y = 0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF;
        const z = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
        const argb = argbFromXyz(x, y, z);
        return argb;
    }
    /// Given color expressed in XYZ and viewed in [viewingConditions], convert to
    /// CAM16.
    static fromXyzInViewingConditions(x, y, z, viewingConditions) {
        // Transform XYZ to 'cone'/'rgb' responses
        const rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
        const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
        const bC = -2079e-6 * x + 0.048952 * y + 0.953127 * z;
        // Discount illuminant
        const rD = viewingConditions.rgbD[0] * rC;
        const gD = viewingConditions.rgbD[1] * gC;
        const bD = viewingConditions.rgbD[2] * bC;
        // chromatic adaptation
        const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100.0, 0.42);
        const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100.0, 0.42);
        const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100.0, 0.42);
        const rA = signum(rD) * 400.0 * rAF / (rAF + 27.13);
        const gA = signum(gD) * 400.0 * gAF / (gAF + 27.13);
        const bA = signum(bD) * 400.0 * bAF / (bAF + 27.13);
        // redness-greenness
        const a = (11.0 * rA + -12 * gA + bA) / 11.0;
        // yellowness-blueness
        const b = (rA + gA - 2.0 * bA) / 9.0;
        // auxiliary components
        const u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0;
        const p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;
        // hue
        const atan2 = Math.atan2(b, a);
        const atanDegrees = atan2 * 180.0 / Math.PI;
        const hue = atanDegrees < 0 ? atanDegrees + 360.0 :
            atanDegrees >= 360 ? atanDegrees - 360 :
                atanDegrees;
        const hueRadians = hue * Math.PI / 180.0;
        // achromatic response to color
        const ac = p2 * viewingConditions.nbb;
        // CAM16 lightness and brightness
        const J = 100.0 *
            Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
        const Q = (4.0 / viewingConditions.c) * Math.sqrt(J / 100.0) *
            (viewingConditions.aw + 4.0) * (viewingConditions.fLRoot);
        const huePrime = (hue < 20.14) ? hue + 360 : hue;
        const eHue = (1.0 / 4.0) * (Math.cos(huePrime * Math.PI / 180.0 + 2.0) + 3.8);
        const p1 = 50000.0 / 13.0 * eHue * viewingConditions.nc * viewingConditions.ncb;
        const t = p1 * Math.sqrt(a * a + b * b) / (u + 0.305);
        const alpha = Math.pow(t, 0.9) *
            Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        // CAM16 chroma, colorfulness, chroma
        const C = alpha * Math.sqrt(J / 100.0);
        const M = C * viewingConditions.fLRoot;
        const s = 50.0 *
            Math.sqrt((alpha * viewingConditions.c) / (viewingConditions.aw + 4.0));
        // CAM16-UCS components
        const jstar = (1.0 + 100.0 * 0.007) * J / (1.0 + 0.007 * J);
        const mstar = Math.log(1.0 + 0.0228 * M) / 0.0228;
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new Cam16(hue, C, J, Q, M, s, jstar, astar, bstar);
    }
    /// XYZ representation of CAM16 seen in [viewingConditions].
    xyzInViewingConditions(viewingConditions) {
        const alpha = (this.chroma === 0.0 || this.j === 0.0) ?
            0.0 :
            this.chroma / Math.sqrt(this.j / 100.0);
        const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1.0 / 0.9);
        const hRad = this.hue * Math.PI / 180.0;
        const eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8);
        const ac = viewingConditions.aw *
            Math.pow(this.j / 100.0, 1.0 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb;
        const p2 = (ac / viewingConditions.nbb);
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);
        const gamma = 23.0 * (p2 + 0.305) * t /
            (23.0 * p1 + 11 * t * hCos + 108.0 * t * hSin);
        const a = gamma * hCos;
        const b = gamma * hSin;
        const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
        const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
        const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;
        const rCBase = Math.max(0, (27.13 * Math.abs(rA)) / (400.0 - Math.abs(rA)));
        const rC = signum(rA) * (100.0 / viewingConditions.fl) *
            Math.pow(rCBase, 1.0 / 0.42);
        const gCBase = Math.max(0, (27.13 * Math.abs(gA)) / (400.0 - Math.abs(gA)));
        const gC = signum(gA) * (100.0 / viewingConditions.fl) *
            Math.pow(gCBase, 1.0 / 0.42);
        const bCBase = Math.max(0, (27.13 * Math.abs(bA)) / (400.0 - Math.abs(bA)));
        const bC = signum(bA) * (100.0 / viewingConditions.fl) *
            Math.pow(bCBase, 1.0 / 0.42);
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];
        const x = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y = 0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF;
        const z = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
        return [x, y, z];
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// This file is automatically generated. Do not modify it.
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable:class-as-namespace
/**
 * A class that solves the HCT equation.
 */
class HctSolver {
    /**
     * Sanitizes a small enough angle in radians.
     *
     * @param angle An angle in radians; must not deviate too much
     * from 0.
     * @return A coterminal angle between 0 and 2pi.
     */
    static sanitizeRadians(angle) {
        return (angle + Math.PI * 8) % (Math.PI * 2);
    }
    /**
     * Delinearizes an RGB component, returning a floating-point
     * number.
     *
     * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
     * linear R/G/B channel
     * @return 0.0 <= output <= 255.0, color channel converted to
     * regular RGB space
     */
    static trueDelinearized(rgbComponent) {
        const normalized = rgbComponent / 100.0;
        let delinearized = 0.0;
        if (normalized <= 0.0031308) {
            delinearized = normalized * 12.92;
        }
        else {
            delinearized = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
        }
        return delinearized * 255.0;
    }
    static chromaticAdaptation(component) {
        const af = Math.pow(Math.abs(component), 0.42);
        return signum(component) * 400.0 * af / (af + 27.13);
    }
    /**
     * Returns the hue of a linear RGB color in CAM16.
     *
     * @param linrgb The linear RGB coordinates of a color.
     * @return The hue of the color in CAM16, in radians.
     */
    static hueOf(linrgb) {
        const scaledDiscount = matrixMultiply(linrgb, HctSolver.SCALED_DISCOUNT_FROM_LINRGB);
        const rA = HctSolver.chromaticAdaptation(scaledDiscount[0]);
        const gA = HctSolver.chromaticAdaptation(scaledDiscount[1]);
        const bA = HctSolver.chromaticAdaptation(scaledDiscount[2]);
        // redness-greenness
        const a = (11.0 * rA + -12 * gA + bA) / 11.0;
        // yellowness-blueness
        const b = (rA + gA - 2.0 * bA) / 9.0;
        return Math.atan2(b, a);
    }
    static areInCyclicOrder(a, b, c) {
        const deltaAB = HctSolver.sanitizeRadians(b - a);
        const deltaAC = HctSolver.sanitizeRadians(c - a);
        return deltaAB < deltaAC;
    }
    /**
     * Solves the lerp equation.
     *
     * @param source The starting number.
     * @param mid The number in the middle.
     * @param target The ending number.
     * @return A number t such that lerp(source, target, t) = mid.
     */
    static intercept(source, mid, target) {
        return (mid - source) / (target - source);
    }
    static lerpPoint(source, t, target) {
        return [
            source[0] + (target[0] - source[0]) * t,
            source[1] + (target[1] - source[1]) * t,
            source[2] + (target[2] - source[2]) * t,
        ];
    }
    /**
     * Intersects a segment with a plane.
     *
     * @param source The coordinates of point A.
     * @param coordinate The R-, G-, or B-coordinate of the plane.
     * @param target The coordinates of point B.
     * @param axis The axis the plane is perpendicular with. (0: R, 1:
     * G, 2: B)
     * @return The intersection point of the segment AB with the plane
     * R=coordinate, G=coordinate, or B=coordinate
     */
    static setCoordinate(source, coordinate, target, axis) {
        const t = HctSolver.intercept(source[axis], coordinate, target[axis]);
        return HctSolver.lerpPoint(source, t, target);
    }
    static isBounded(x) {
        return 0.0 <= x && x <= 100.0;
    }
    /**
     * Returns the nth possible vertex of the polygonal intersection.
     *
     * @param y The Y value of the plane.
     * @param n The zero-based index of the point. 0 <= n <= 11.
     * @return The nth possible vertex of the polygonal intersection
     * of the y plane and the RGB cube, in linear RGB coordinates, if
     * it exists. If this possible vertex lies outside of the cube,
     * [-1.0, -1.0, -1.0] is returned.
     */
    static nthVertex(y, n) {
        const kR = HctSolver.Y_FROM_LINRGB[0];
        const kG = HctSolver.Y_FROM_LINRGB[1];
        const kB = HctSolver.Y_FROM_LINRGB[2];
        const coordA = n % 4 <= 1 ? 0.0 : 100.0;
        const coordB = n % 2 === 0 ? 0.0 : 100.0;
        if (n < 4) {
            const g = coordA;
            const b = coordB;
            const r = (y - g * kG - b * kB) / kR;
            if (HctSolver.isBounded(r)) {
                return [r, g, b];
            }
            else {
                return [-1, -1, -1];
            }
        }
        else if (n < 8) {
            const b = coordA;
            const r = coordB;
            const g = (y - r * kR - b * kB) / kG;
            if (HctSolver.isBounded(g)) {
                return [r, g, b];
            }
            else {
                return [-1, -1, -1];
            }
        }
        else {
            const r = coordA;
            const g = coordB;
            const b = (y - r * kR - g * kG) / kB;
            if (HctSolver.isBounded(b)) {
                return [r, g, b];
            }
            else {
                return [-1, -1, -1];
            }
        }
    }
    /**
     * Finds the segment containing the desired color.
     *
     * @param y The Y value of the color.
     * @param targetHue The hue of the color.
     * @return A list of two sets of linear RGB coordinates, each
     * corresponding to an endpoint of the segment containing the
     * desired color.
     */
    static bisectToSegment(y, targetHue) {
        let left = [-1, -1, -1];
        let right = left;
        let leftHue = 0.0;
        let rightHue = 0.0;
        let initialized = false;
        let uncut = true;
        for (let n = 0; n < 12; n++) {
            const mid = HctSolver.nthVertex(y, n);
            if (mid[0] < 0) {
                continue;
            }
            const midHue = HctSolver.hueOf(mid);
            if (!initialized) {
                left = mid;
                right = mid;
                leftHue = midHue;
                rightHue = midHue;
                initialized = true;
                continue;
            }
            if (uncut || HctSolver.areInCyclicOrder(leftHue, midHue, rightHue)) {
                uncut = false;
                if (HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
                    right = mid;
                    rightHue = midHue;
                }
                else {
                    left = mid;
                    leftHue = midHue;
                }
            }
        }
        return [left, right];
    }
    static midpoint(a, b) {
        return [
            (a[0] + b[0]) / 2,
            (a[1] + b[1]) / 2,
            (a[2] + b[2]) / 2,
        ];
    }
    static criticalPlaneBelow(x) {
        return Math.floor(x - 0.5);
    }
    static criticalPlaneAbove(x) {
        return Math.ceil(x - 0.5);
    }
    /**
     * Finds a color with the given Y and hue on the boundary of the
     * cube.
     *
     * @param y The Y value of the color.
     * @param targetHue The hue of the color.
     * @return The desired color, in linear RGB coordinates.
     */
    static bisectToLimit(y, targetHue) {
        const segment = HctSolver.bisectToSegment(y, targetHue);
        let left = segment[0];
        let leftHue = HctSolver.hueOf(left);
        let right = segment[1];
        for (let axis = 0; axis < 3; axis++) {
            if (left[axis] !== right[axis]) {
                let lPlane = -1;
                let rPlane = 255;
                if (left[axis] < right[axis]) {
                    lPlane = HctSolver.criticalPlaneBelow(HctSolver.trueDelinearized(left[axis]));
                    rPlane = HctSolver.criticalPlaneAbove(HctSolver.trueDelinearized(right[axis]));
                }
                else {
                    lPlane = HctSolver.criticalPlaneAbove(HctSolver.trueDelinearized(left[axis]));
                    rPlane = HctSolver.criticalPlaneBelow(HctSolver.trueDelinearized(right[axis]));
                }
                for (let i = 0; i < 8; i++) {
                    if (Math.abs(rPlane - lPlane) <= 1) {
                        break;
                    }
                    else {
                        const mPlane = Math.floor((lPlane + rPlane) / 2.0);
                        const midPlaneCoordinate = HctSolver.CRITICAL_PLANES[mPlane];
                        const mid = HctSolver.setCoordinate(left, midPlaneCoordinate, right, axis);
                        const midHue = HctSolver.hueOf(mid);
                        if (HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
                            right = mid;
                            rPlane = mPlane;
                        }
                        else {
                            left = mid;
                            leftHue = midHue;
                            lPlane = mPlane;
                        }
                    }
                }
            }
        }
        return HctSolver.midpoint(left, right);
    }
    static inverseChromaticAdaptation(adapted) {
        const adaptedAbs = Math.abs(adapted);
        const base = Math.max(0, 27.13 * adaptedAbs / (400.0 - adaptedAbs));
        return signum(adapted) * Math.pow(base, 1.0 / 0.42);
    }
    /**
     * Finds a color with the given hue, chroma, and Y.
     *
     * @param hueRadians The desired hue in radians.
     * @param chroma The desired chroma.
     * @param y The desired Y.
     * @return The desired color as a hexadecimal integer, if found; 0
     * otherwise.
     */
    static findResultByJ(hueRadians, chroma, y) {
        // Initial estimate of j.
        let j = Math.sqrt(y) * 11.0;
        // ===========================================================
        // Operations inlined from Cam16 to avoid repeated calculation
        // ===========================================================
        const viewingConditions = ViewingConditions.DEFAULT;
        const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        const eHue = 0.25 * (Math.cos(hueRadians + 2.0) + 3.8);
        const p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb;
        const hSin = Math.sin(hueRadians);
        const hCos = Math.cos(hueRadians);
        for (let iterationRound = 0; iterationRound < 5; iterationRound++) {
            // ===========================================================
            // Operations inlined from Cam16 to avoid repeated calculation
            // ===========================================================
            const jNormalized = j / 100.0;
            const alpha = chroma === 0.0 || j === 0.0 ? 0.0 : chroma / Math.sqrt(jNormalized);
            const t = Math.pow(alpha * tInnerCoeff, 1.0 / 0.9);
            const ac = viewingConditions.aw *
                Math.pow(jNormalized, 1.0 / viewingConditions.c / viewingConditions.z);
            const p2 = ac / viewingConditions.nbb;
            const gamma = 23.0 * (p2 + 0.305) * t /
                (23.0 * p1 + 11 * t * hCos + 108.0 * t * hSin);
            const a = gamma * hCos;
            const b = gamma * hSin;
            const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
            const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
            const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;
            const rCScaled = HctSolver.inverseChromaticAdaptation(rA);
            const gCScaled = HctSolver.inverseChromaticAdaptation(gA);
            const bCScaled = HctSolver.inverseChromaticAdaptation(bA);
            const linrgb = matrixMultiply([rCScaled, gCScaled, bCScaled], HctSolver.LINRGB_FROM_SCALED_DISCOUNT);
            // ===========================================================
            // Operations inlined from Cam16 to avoid repeated calculation
            // ===========================================================
            if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) {
                return 0;
            }
            const kR = HctSolver.Y_FROM_LINRGB[0];
            const kG = HctSolver.Y_FROM_LINRGB[1];
            const kB = HctSolver.Y_FROM_LINRGB[2];
            const fnj = kR * linrgb[0] + kG * linrgb[1] + kB * linrgb[2];
            if (fnj <= 0) {
                return 0;
            }
            if (iterationRound === 4 || Math.abs(fnj - y) < 0.002) {
                if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) {
                    return 0;
                }
                return argbFromLinrgb(linrgb);
            }
            // Iterates with Newton method,
            // Using 2 * fn(j) / j as the approximation of fn'(j)
            j = j - (fnj - y) * j / (2 * fnj);
        }
        return 0;
    }
    /**
     * Finds an sRGB color with the given hue, chroma, and L*, if
     * possible.
     *
     * @param hueDegrees The desired hue, in degrees.
     * @param chroma The desired chroma.
     * @param lstar The desired L*.
     * @return A hexadecimal representing the sRGB color. The color
     * has sufficiently close hue, chroma, and L* to the desired
     * values, if possible; otherwise, the hue and L* will be
     * sufficiently close, and chroma will be maximized.
     */
    static solveToInt(hueDegrees, chroma, lstar) {
        if (chroma < 0.0001 || lstar < 0.0001 || lstar > 99.9999) {
            return argbFromLstar(lstar);
        }
        hueDegrees = sanitizeDegreesDouble(hueDegrees);
        const hueRadians = hueDegrees / 180 * Math.PI;
        const y = yFromLstar(lstar);
        const exactAnswer = HctSolver.findResultByJ(hueRadians, chroma, y);
        if (exactAnswer !== 0) {
            return exactAnswer;
        }
        const linrgb = HctSolver.bisectToLimit(y, hueRadians);
        return argbFromLinrgb(linrgb);
    }
    /**
     * Finds an sRGB color with the given hue, chroma, and L*, if
     * possible.
     *
     * @param hueDegrees The desired hue, in degrees.
     * @param chroma The desired chroma.
     * @param lstar The desired L*.
     * @return An CAM16 object representing the sRGB color. The color
     * has sufficiently close hue, chroma, and L* to the desired
     * values, if possible; otherwise, the hue and L* will be
     * sufficiently close, and chroma will be maximized.
     */
    static solveToCam(hueDegrees, chroma, lstar) {
        return Cam16.fromInt(HctSolver.solveToInt(hueDegrees, chroma, lstar));
    }
}
HctSolver.SCALED_DISCOUNT_FROM_LINRGB = [
    [
        0.001200833568784504,
        0.002389694492170889,
        0.0002795742885861124,
    ],
    [
        0.0005891086651375999,
        0.0029785502573438758,
        0.0003270666104008398,
    ],
    [
        0.00010146692491640572,
        0.0005364214359186694,
        0.0032979401770712076,
    ],
];
HctSolver.LINRGB_FROM_SCALED_DISCOUNT = [
    [
        1373.2198709594231,
        -1100.4251190754821,
        -7.278681089101213,
    ],
    [
        -271.815969077903,
        559.6580465940733,
        -32.46047482791194,
    ],
    [
        1.9622899599665666,
        -57.173814538844006,
        308.7233197812385,
    ],
];
HctSolver.Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];
HctSolver.CRITICAL_PLANES = [
    0.015176349177441876, 0.045529047532325624, 0.07588174588720938,
    0.10623444424209313, 0.13658714259697685, 0.16693984095186062,
    0.19729253930674434, 0.2276452376616281, 0.2579979360165119,
    0.28835063437139563, 0.3188300904430532, 0.350925934958123,
    0.3848314933096426, 0.42057480301049466, 0.458183274052838,
    0.4976837250274023, 0.5391024159806381, 0.5824650784040898,
    0.6277969426914107, 0.6751227633498623, 0.7244668422128921,
    0.775853049866786, 0.829304845476233, 0.8848452951698498,
    0.942497089126609, 1.0022825574869039, 1.0642236851973577,
    1.1283421258858297, 1.1946592148522128, 1.2631959812511864,
    1.3339731595349034, 1.407011200216447, 1.4823302800086415,
    1.5599503113873272, 1.6398909516233677, 1.7221716113234105,
    1.8068114625156377, 1.8938294463134073, 1.9832442801866852,
    2.075074464868551, 2.1693382909216234, 2.2660538449872063,
    2.36523901573795, 2.4669114995532007, 2.5710888059345764,
    2.6777882626779785, 2.7870270208169257, 2.898822059350997,
    3.0131901897720907, 3.1301480604002863, 3.2497121605402226,
    3.3718988244681087, 3.4967242352587946, 3.624204428461639,
    3.754355295633311, 3.887192587735158, 4.022731918402185,
    4.160988767090289, 4.301978482107941, 4.445716283538092,
    4.592217266055746, 4.741496401646282, 4.893568542229298,
    5.048448422192488, 5.20615066083972, 5.3666897647573375,
    5.5300801301023865, 5.696336044816294, 5.865471690767354,
    6.037501145825082, 6.212438385869475, 6.390297286737924,
    6.571091626112461, 6.7548350853498045, 6.941541251256611,
    7.131223617812143, 7.323895587840543, 7.5195704746346665,
    7.7182615035334345, 7.919981813454504, 8.124744458384042,
    8.332562408825165, 8.543448553206703, 8.757415699253682,
    8.974476575321063, 9.194643831691977, 9.417930041841839,
    9.644347703669503, 9.873909240696694, 10.106627003236781,
    10.342513269534024, 10.58158024687427, 10.8238400726681,
    11.069304815507364, 11.317986476196008, 11.569896988756009,
    11.825048221409341, 12.083451977536606, 12.345119996613247,
    12.610063955123938, 12.878295467455942, 13.149826086772048,
    13.42466730586372, 13.702830557985108, 13.984327217668513,
    14.269168601521828, 14.55736596900856, 14.848930523210871,
    15.143873411576273, 15.44220572664832, 15.743938506781891,
    16.04908273684337, 16.35764934889634, 16.66964922287304,
    16.985093187232053, 17.30399201960269, 17.62635644741625,
    17.95219714852476, 18.281524751807332, 18.614349837764564,
    18.95068293910138, 19.290534541298456, 19.633915083172692,
    19.98083495742689, 20.331304511189067, 20.685334046541502,
    21.042933821039977, 21.404114048223256, 21.76888489811322,
    22.137256497705877, 22.50923893145328, 22.884842241736916,
    23.264076429332462, 23.6469514538663, 24.033477234264016,
    24.42366364919083, 24.817520537484558, 25.21505769858089,
    25.61628489293138, 26.021211842414342, 26.429848230738664,
    26.842203703840827, 27.258287870275353, 27.678110301598522,
    28.10168053274597, 28.529008062403893, 28.96010235337422,
    29.39497283293396, 29.83362889318845, 30.276079891419332,
    30.722335150426627, 31.172403958865512, 31.62629557157785,
    32.08401920991837, 32.54558406207592, 33.010999283389665,
    33.4802739966603, 33.953417292456834, 34.430438229418264,
    34.911345834551085, 35.39614910352207, 35.88485700094671,
    36.37747846067349, 36.87402238606382, 37.37449765026789,
    37.87891309649659, 38.38727753828926, 38.89959975977785,
    39.41588851594697, 39.93615253289054, 40.460400508064545,
    40.98864111053629, 41.520882981230194, 42.05713473317016,
    42.597404951718396, 43.141702194811224, 43.6900349931913,
    44.24241185063697, 44.798841244188324, 45.35933162437017,
    45.92389141541209, 46.49252901546552, 47.065252796817916,
    47.64207110610409, 48.22299226451468, 48.808024568002054,
    49.3971762874833, 49.9904556690408, 50.587870934119984,
    51.189430279724725, 51.79514187861014, 52.40501387947288,
    53.0190544071392, 53.637271562750364, 54.259673423945976,
    54.88626804504493, 55.517063457223934, 56.15206766869424,
    56.79128866487574, 57.43473440856916, 58.08241284012621,
    58.734331877617365, 59.39049941699807, 60.05092333227251,
    60.715611475655585, 61.38457167773311, 62.057811747619894,
    62.7353394731159, 63.417162620860914, 64.10328893648692,
    64.79372614476921, 65.48848194977529, 66.18756403501224,
    66.89098006357258, 67.59873767827808, 68.31084450182222,
    69.02730813691093, 69.74813616640164, 70.47333615344107,
    71.20291564160104, 71.93688215501312, 72.67524319850172,
    73.41800625771542, 74.16517879925733, 74.9167682708136,
    75.67278210128072, 76.43322770089146, 77.1981124613393,
    77.96744375590167, 78.74122893956174, 79.51947534912904,
    80.30219030335869, 81.08938110306934, 81.88105503125999,
    82.67721935322541, 83.4778813166706, 84.28304815182372,
    85.09272707154808, 85.90692527145302, 86.72564993000343,
    87.54890820862819, 88.3767072518277, 89.2090541872801,
    90.04595612594655, 90.88742016217518, 91.73345337380438,
    92.58406282226491, 93.43925555268066, 94.29903859396902,
    95.16341895893969, 96.03240364439274, 96.9059996312159,
    97.78421388448044, 98.6670533535366, 99.55452497210776,
];

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A color system built using CAM16 hue and chroma, and L* from
 * L*a*b*.
 *
 * Using L* creates a link between the color system, contrast, and thus
 * accessibility. Contrast ratio depends on relative luminance, or Y in the XYZ
 * color space. L*, or perceptual luminance can be calculated from Y.
 *
 * Unlike Y, L* is linear to human perception, allowing trivial creation of
 * accurate color tones.
 *
 * Unlike contrast ratio, measuring contrast in L* is linear, and simple to
 * calculate. A difference of 40 in HCT tone guarantees a contrast ratio >= 3.0,
 * and a difference of 50 guarantees a contrast ratio >= 4.5.
 */
/**
 * HCT, hue, chroma, and tone. A color system that provides a perceptually
 * accurate color measurement system that can also accurately render what colors
 * will appear as in different lighting environments.
 */
class Hct {
    static from(hue, chroma, tone) {
        return new Hct(HctSolver.solveToInt(hue, chroma, tone));
    }
    /**
     * @param argb ARGB representation of a color.
     * @return HCT representation of a color in default viewing conditions
     */
    static fromInt(argb) {
        return new Hct(argb);
    }
    toInt() {
        return this.argb;
    }
    /**
     * A number, in degrees, representing ex. red, orange, yellow, etc.
     * Ranges from 0 <= hue < 360.
     */
    get hue() {
        return this.internalHue;
    }
    /**
     * @param newHue 0 <= newHue < 360; invalid values are corrected.
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set hue(newHue) {
        this.setInternalState(HctSolver.solveToInt(newHue, this.internalChroma, this.internalTone));
    }
    get chroma() {
        return this.internalChroma;
    }
    /**
     * @param newChroma 0 <= newChroma < ?
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set chroma(newChroma) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, newChroma, this.internalTone));
    }
    /** Lightness. Ranges from 0 to 100. */
    get tone() {
        return this.internalTone;
    }
    /**
     * @param newTone 0 <= newTone <= 100; invalid valids are corrected.
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set tone(newTone) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, newTone));
    }
    /** Sets a property of the Hct object. */
    setValue(propertyName, value) {
        this[propertyName] = value;
    }
    toString() {
        return `HCT(${this.hue.toFixed(0)}, ${this.chroma.toFixed(0)}, ${this.tone.toFixed(0)})`;
    }
    static isBlue(hue) {
        return hue >= 250 && hue < 270;
    }
    static isYellow(hue) {
        return hue >= 105 && hue < 125;
    }
    static isCyan(hue) {
        return hue >= 170 && hue < 207;
    }
    constructor(argb) {
        this.argb = argb;
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = lstarFromArgb(argb);
        this.argb = argb;
    }
    setInternalState(argb) {
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = lstarFromArgb(argb);
        this.argb = argb;
    }
    /**
     * Translates a color into different [ViewingConditions].
     *
     * Colors change appearance. They look different with lights on versus off,
     * the same color, as in hex code, on white looks different when on black.
     * This is called color relativity, most famously explicated by Josef Albers
     * in Interaction of Color.
     *
     * In color science, color appearance models can account for this and
     * calculate the appearance of a color in different settings. HCT is based on
     * CAM16, a color appearance model, and uses it to make these calculations.
     *
     * See [ViewingConditions.make] for parameters affecting color appearance.
     */
    inViewingConditions(vc) {
        // 1. Use CAM16 to find XYZ coordinates of color in specified VC.
        const cam = Cam16.fromInt(this.toInt());
        const viewedInVc = cam.xyzInViewingConditions(vc);
        // 2. Create CAM16 of those XYZ coordinates in default VC.
        const recastInVc = Cam16.fromXyzInViewingConditions(viewedInVc[0], viewedInVc[1], viewedInVc[2], ViewingConditions.make());
        // 3. Create HCT from:
        // - CAM16 using default VC with XYZ coordinates in specified VC.
        // - L* converted from Y in XYZ coordinates in specified VC.
        const recastHct = Hct.from(recastInVc.hue, recastInVc.chroma, lstarFromY(viewedInVc[1]));
        return recastHct;
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable:class-as-namespace
/**
 * Utility methods for calculating contrast given two colors, or calculating a
 * color given one color and a contrast ratio.
 *
 * Contrast ratio is calculated using XYZ's Y. When linearized to match human
 * perception, Y becomes HCT's tone and L*a*b*'s' L*. Informally, this is the
 * lightness of a color.
 *
 * Methods refer to tone, T in the the HCT color space.
 * Tone is equivalent to L* in the L*a*b* color space, or L in the LCH color
 * space.
 */
class Contrast {
    /**
     * Returns a contrast ratio, which ranges from 1 to 21.
     *
     * @param toneA Tone between 0 and 100. Values outside will be clamped.
     * @param toneB Tone between 0 and 100. Values outside will be clamped.
     */
    static ratioOfTones(toneA, toneB) {
        toneA = clampDouble(0.0, 100.0, toneA);
        toneB = clampDouble(0.0, 100.0, toneB);
        return Contrast.ratioOfYs(yFromLstar(toneA), yFromLstar(toneB));
    }
    static ratioOfYs(y1, y2) {
        const lighter = y1 > y2 ? y1 : y2;
        const darker = (lighter === y2) ? y1 : y2;
        return (lighter + 5.0) / (darker + 5.0);
    }
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns -1 if ratio cannot be achieved with tone parameter.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in -1 being returned.
     * @param ratio Contrast ratio of return value and tone.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static lighter(tone, ratio) {
        if (tone < 0.0 || tone > 100.0) {
            return -1;
        }
        const darkY = yFromLstar(tone);
        const lightY = ratio * (darkY + 5.0) - 5.0;
        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
            return -1;
        }
        // Ensure gamut mapping, which requires a 'range' on tone, will still result
        // the correct ratio by darkening slightly.
        const returnValue = lstarFromY(lightY) + 0.4;
        if (returnValue < 0 || returnValue > 100) {
            return -1;
        }
        return returnValue;
    }
    /**
     * Returns a tone <= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns -1 if ratio cannot be achieved with tone parameter.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in -1 being returned.
     * @param ratio Contrast ratio of return value and tone.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static darker(tone, ratio) {
        if (tone < 0.0 || tone > 100.0) {
            return -1;
        }
        const lightY = yFromLstar(tone);
        const darkY = ((lightY + 5.0) / ratio) - 5.0;
        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
            return -1;
        }
        // Ensure gamut mapping, which requires a 'range' on tone, will still result
        // the correct ratio by darkening slightly.
        const returnValue = lstarFromY(darkY) - 0.4;
        if (returnValue < 0 || returnValue > 100) {
            return -1;
        }
        return returnValue;
    }
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns 100 if ratio cannot be achieved with tone parameter.
     *
     * This method is unsafe because the returned value is guaranteed to be in
     * bounds for tone, i.e. between 0 and 100. However, that value may not reach
     * the ratio with tone. For example, there is no color lighter than T100.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in 100 being returned.
     * @param ratio Desired contrast ratio of return value and tone parameter.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static lighterUnsafe(tone, ratio) {
        const lighterSafe = Contrast.lighter(tone, ratio);
        return (lighterSafe < 0.0) ? 100.0 : lighterSafe;
    }
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns 100 if ratio cannot be achieved with tone parameter.
     *
     * This method is unsafe because the returned value is guaranteed to be in
     * bounds for tone, i.e. between 0 and 100. However, that value may not reach
     * the [ratio with [tone]. For example, there is no color darker than T0.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in 0 being returned.
     * @param ratio Desired contrast ratio of return value and tone parameter.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static darkerUnsafe(tone, ratio) {
        const darkerSafe = Contrast.darker(tone, ratio);
        return (darkerSafe < 0.0) ? 0.0 : darkerSafe;
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable:class-as-namespace
/**
 * Check and/or fix universally disliked colors.
 * Color science studies of color preference indicate universal distaste for
 * dark yellow-greens, and also show this is correlated to distate for
 * biological waste and rotting food.
 *
 * See Palmer and Schloss, 2010 or Schloss and Palmer's Chapter 21 in Handbook
 * of Color Psychology (2015).
 */
class DislikeAnalyzer {
    /**
     * Returns true if a color is disliked.
     *
     * @param hct A color to be judged.
     * @return Whether the color is disliked.
     *
     * Disliked is defined as a dark yellow-green that is not neutral.
     */
    static isDisliked(hct) {
        const huePasses = Math.round(hct.hue) >= 90.0 && Math.round(hct.hue) <= 111.0;
        const chromaPasses = Math.round(hct.chroma) > 16.0;
        const tonePasses = Math.round(hct.tone) < 65.0;
        return huePasses && chromaPasses && tonePasses;
    }
    /**
     * If a color is disliked, lighten it to make it likable.
     *
     * @param hct A color to be judged.
     * @return A new color if the original color is disliked, or the original
     *   color if it is acceptable.
     */
    static fixIfDisliked(hct) {
        if (DislikeAnalyzer.isDisliked(hct)) {
            return Hct.from(hct.hue, hct.chroma, 70.0);
        }
        return hct;
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function validateExtendedColor(originalColor, specVersion, extendedColor) {
    if (originalColor.name !== extendedColor.name) {
        throw new Error(`Attempting to extend color ${originalColor.name} with color ${extendedColor.name} of different name for spec version ${specVersion}.`);
    }
    if (originalColor.isBackground !== extendedColor.isBackground) {
        throw new Error(`Attempting to extend color ${originalColor.name} as a ${(originalColor.isBackground ?
            'background' :
            'foreground')} with color ${extendedColor.name} as a ${(extendedColor.isBackground ?
            'background' :
            'foreground')} for spec version ${specVersion}.`);
    }
}
/**
 * Returns a new DynamicColor that is the same as the original color, but with
 * the extended dynamic color's constraints for the given spec version.
 *
 * @param originlColor The original color.
 * @param specVersion The spec version to extend.
 * @param extendedColor The color with the values to extend.
 */
function extendSpecVersion(originlColor, specVersion, extendedColor) {
    validateExtendedColor(originlColor, specVersion, extendedColor);
    return DynamicColor.fromPalette({
        name: originlColor.name,
        palette: (s) => s.specVersion === specVersion ? extendedColor.palette(s) :
            originlColor.palette(s),
        tone: (s) => s.specVersion === specVersion ? extendedColor.tone(s) :
            originlColor.tone(s),
        isBackground: originlColor.isBackground,
        chromaMultiplier: (s) => {
            const chromaMultiplier = s.specVersion === specVersion ?
                extendedColor.chromaMultiplier :
                originlColor.chromaMultiplier;
            return chromaMultiplier !== undefined ? chromaMultiplier(s) : 1;
        },
        background: (s) => {
            const background = s.specVersion === specVersion ?
                extendedColor.background :
                originlColor.background;
            return background !== undefined ? background(s) : undefined;
        },
        secondBackground: (s) => {
            const secondBackground = s.specVersion === specVersion ?
                extendedColor.secondBackground :
                originlColor.secondBackground;
            return secondBackground !== undefined ? secondBackground(s) : undefined;
        },
        contrastCurve: (s) => {
            const contrastCurve = s.specVersion === specVersion ?
                extendedColor.contrastCurve :
                originlColor.contrastCurve;
            return contrastCurve !== undefined ? contrastCurve(s) : undefined;
        },
        toneDeltaPair: (s) => {
            const toneDeltaPair = s.specVersion === specVersion ?
                extendedColor.toneDeltaPair :
                originlColor.toneDeltaPair;
            return toneDeltaPair !== undefined ? toneDeltaPair(s) : undefined;
        },
    });
}
/**
 * A color that adjusts itself based on UI state provided by DynamicScheme.
 *
 * Colors without backgrounds do not change tone when contrast changes. Colors
 * with backgrounds become closer to their background as contrast lowers, and
 * further when contrast increases.
 *
 * Prefer static constructors. They require either a hexcode, a palette and
 * tone, or a hue and chroma. Optionally, they can provide a background
 * DynamicColor.
 */
class DynamicColor {
    /**
     * Create a DynamicColor defined by a TonalPalette and HCT tone.
     *
     * @param args Functions with DynamicScheme as input. Must provide a palette
     *     and tone. May provide a background DynamicColor and ToneDeltaPair.
     */
    static fromPalette(args) {
        return new DynamicColor(args.name ?? '', args.palette, args.tone ?? DynamicColor.getInitialToneFromBackground(args.background), args.isBackground ?? false, args.chromaMultiplier, args.background, args.secondBackground, args.contrastCurve, args.toneDeltaPair);
    }
    static getInitialToneFromBackground(background) {
        if (background === undefined) {
            return (s) => 50;
        }
        return (s) => background(s) ? background(s).getTone(s) : 50;
    }
    /**
     * The base constructor for DynamicColor.
     *
     * _Strongly_ prefer using one of the convenience constructors. This class is
     * arguably too flexible to ensure it can support any scenario. Functional
     * arguments allow  overriding without risks that come with subclasses.
     *
     * For example, the default behavior of adjust tone at max contrast
     * to be at a 7.0 ratio with its background is principled and
     * matches accessibility guidance. That does not mean it's the desired
     * approach for _every_ design system, and every color pairing,
     * always, in every case.
     *
     * @param name The name of the dynamic color. Defaults to empty.
     * @param palette Function that provides a TonalPalette given DynamicScheme. A
     *     TonalPalette is defined by a hue and chroma, so this replaces the need
     *     to specify hue/chroma. By providing a tonal palette, when contrast
     *     adjustments are made, intended chroma can be preserved.
     * @param tone Function that provides a tone, given a DynamicScheme.
     * @param isBackground Whether this dynamic color is a background, with some
     *     other color as the foreground. Defaults to false.
     * @param chromaMultiplier A factor that multiplies the chroma for this color.
     * @param background The background of the dynamic color (as a function of a
     *     `DynamicScheme`), if it exists.
     * @param secondBackground A second background of the dynamic color (as a
     *     function of a `DynamicScheme`), if it exists.
     * @param contrastCurve A `ContrastCurve` object specifying how its contrast
     *     against its background should behave in various contrast levels
     *     options.
     * @param toneDeltaPair A `ToneDeltaPair` object specifying a tone delta
     *     constraint between two colors. One of them must be the color being
     *     constructed.
     */
    constructor(name, palette, tone, isBackground, chromaMultiplier, background, secondBackground, contrastCurve, toneDeltaPair) {
        this.name = name;
        this.palette = palette;
        this.tone = tone;
        this.isBackground = isBackground;
        this.chromaMultiplier = chromaMultiplier;
        this.background = background;
        this.secondBackground = secondBackground;
        this.contrastCurve = contrastCurve;
        this.toneDeltaPair = toneDeltaPair;
        this.hctCache = new Map();
        if ((!background) && secondBackground) {
            throw new Error(`Color ${name} has secondBackground` +
                `defined, but background is not defined.`);
        }
        if ((!background) && contrastCurve) {
            throw new Error(`Color ${name} has contrastCurve` +
                `defined, but background is not defined.`);
        }
        if (background && !contrastCurve) {
            throw new Error(`Color ${name} has background` +
                `defined, but contrastCurve is not defined.`);
        }
    }
    /**
     * Returns a deep copy of this DynamicColor.
     */
    clone() {
        return DynamicColor.fromPalette({
            name: this.name,
            palette: this.palette,
            tone: this.tone,
            isBackground: this.isBackground,
            chromaMultiplier: this.chromaMultiplier,
            background: this.background,
            secondBackground: this.secondBackground,
            contrastCurve: this.contrastCurve,
            toneDeltaPair: this.toneDeltaPair,
        });
    }
    /**
     * Clears the cache of HCT values for this color. For testing or debugging
     * purposes.
     */
    clearCache() {
        this.hctCache.clear();
    }
    /**
     * Returns a ARGB integer (i.e. a hex code).
     *
     * @param scheme Defines the conditions of the user interface, for example,
     *     whether or not it is dark mode or light mode, and what the desired
     *     contrast level is.
     */
    getArgb(scheme) {
        return this.getHct(scheme).toInt();
    }
    /**
     * Returns a color, expressed in the HCT color space, that this
     * DynamicColor is under the conditions in scheme.
     *
     * @param scheme Defines the conditions of the user interface, for example,
     *     whether or not it is dark mode or light mode, and what the desired
     *     contrast level is.
     */
    getHct(scheme) {
        const cachedAnswer = this.hctCache.get(scheme);
        if (cachedAnswer != null) {
            return cachedAnswer;
        }
        const answer = getSpec$1(scheme.specVersion).getHct(scheme, this);
        if (this.hctCache.size > 4) {
            this.hctCache.clear();
        }
        this.hctCache.set(scheme, answer);
        return answer;
    }
    /**
     * Returns a tone, T in the HCT color space, that this DynamicColor is under
     * the conditions in scheme.
     *
     * @param scheme Defines the conditions of the user interface, for example,
     *     whether or not it is dark mode or light mode, and what the desired
     *     contrast level is.
     */
    getTone(scheme) {
        return getSpec$1(scheme.specVersion).getTone(scheme, this);
    }
    /**
     * Given a background tone, finds a foreground tone, while ensuring they reach
     * a contrast ratio that is as close to [ratio] as possible.
     *
     * @param bgTone Tone in HCT. Range is 0 to 100, undefined behavior when it
     *     falls outside that range.
     * @param ratio The contrast ratio desired between bgTone and the return
     *     value.
     */
    static foregroundTone(bgTone, ratio) {
        const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
        const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);
        const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
        const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);
        const preferLighter = DynamicColor.tonePrefersLightForeground(bgTone);
        if (preferLighter) {
            // This handles an edge case where the initial contrast ratio is high
            // (ex. 13.0), and the ratio passed to the function is that high
            // ratio, and both the lighter and darker ratio fails to pass that
            // ratio.
            //
            // This was observed with Tonal Spot's On Primary Container turning
            // black momentarily between high and max contrast in light mode. PC's
            // standard tone was T90, OPC's was T10, it was light mode, and the
            // contrast value was 0.6568521221032331.
            const negligibleDifference = Math.abs(lighterRatio - darkerRatio) < 0.1 &&
                lighterRatio < ratio && darkerRatio < ratio;
            return lighterRatio >= ratio || lighterRatio >= darkerRatio ||
                negligibleDifference ?
                lighterTone :
                darkerTone;
        }
        else {
            return darkerRatio >= ratio || darkerRatio >= lighterRatio ? darkerTone :
                lighterTone;
        }
    }
    /**
     * Returns whether [tone] prefers a light foreground.
     *
     * People prefer white foregrounds on ~T60-70. Observed over time, and also
     * by Andrew Somers during research for APCA.
     *
     * T60 used as to create the smallest discontinuity possible when skipping
     * down to T49 in order to ensure light foregrounds.
     * Since `tertiaryContainer` in dark monochrome scheme requires a tone of
     * 60, it should not be adjusted. Therefore, 60 is excluded here.
     */
    static tonePrefersLightForeground(tone) {
        return Math.round(tone) < 60.0;
    }
    /**
     * Returns whether [tone] can reach a contrast ratio of 4.5 with a lighter
     * color.
     */
    static toneAllowsLightForeground(tone) {
        return Math.round(tone) <= 49.0;
    }
    /**
     * Adjusts a tone such that white has 4.5 contrast, if the tone is
     * reasonably close to supporting it.
     */
    static enableLightForeground(tone) {
        if (DynamicColor.tonePrefersLightForeground(tone) &&
            !DynamicColor.toneAllowsLightForeground(tone)) {
            return 49.0;
        }
        return tone;
    }
}
/**
 * A delegate for the color calculation of a DynamicScheme in the 2021 spec.
 */
class ColorCalculationDelegateImpl2021 {
    getHct(scheme, color) {
        const tone = color.getTone(scheme);
        const palette = color.palette(scheme);
        return palette.getHct(tone);
    }
    getTone(scheme, color) {
        const decreasingContrast = scheme.contrastLevel < 0;
        const toneDeltaPair = color.toneDeltaPair ? color.toneDeltaPair(scheme) : undefined;
        // Case 1: dual foreground, pair of colors with delta constraint.
        if (toneDeltaPair) {
            const roleA = toneDeltaPair.roleA;
            const roleB = toneDeltaPair.roleB;
            const delta = toneDeltaPair.delta;
            const polarity = toneDeltaPair.polarity;
            const stayTogether = toneDeltaPair.stayTogether;
            const aIsNearer = (polarity === 'nearer' ||
                (polarity === 'lighter' && !scheme.isDark) ||
                (polarity === 'darker' && scheme.isDark));
            const nearer = aIsNearer ? roleA : roleB;
            const farther = aIsNearer ? roleB : roleA;
            const amNearer = color.name === nearer.name;
            const expansionDir = scheme.isDark ? 1 : -1;
            let nTone = nearer.tone(scheme);
            let fTone = farther.tone(scheme);
            // 1st round: solve to min for each, if background and contrast curve
            // are defined.
            if (color.background && nearer.contrastCurve && farther.contrastCurve) {
                const bg = color.background(scheme);
                const nContrastCurve = nearer.contrastCurve(scheme);
                const fContrastCurve = farther.contrastCurve(scheme);
                if (bg && nContrastCurve && fContrastCurve) {
                    const bgTone = bg.getTone(scheme);
                    const nContrast = nContrastCurve.get(scheme.contrastLevel);
                    const fContrast = fContrastCurve.get(scheme.contrastLevel);
                    // If a color is good enough, it is not adjusted.
                    // Initial and adjusted tones for `nearer`
                    if (Contrast.ratioOfTones(bgTone, nTone) < nContrast) {
                        nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                    }
                    // Initial and adjusted tones for `farther`
                    if (Contrast.ratioOfTones(bgTone, fTone) < fContrast) {
                        fTone = DynamicColor.foregroundTone(bgTone, fContrast);
                    }
                    if (decreasingContrast) {
                        // If decreasing contrast, adjust color to the "bare minimum"
                        // that satisfies contrast.
                        nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                        fTone = DynamicColor.foregroundTone(bgTone, fContrast);
                    }
                }
            }
            if ((fTone - nTone) * expansionDir < delta) {
                // 2nd round: expand farther to match delta, if contrast is not
                // satisfied.
                fTone = clampDouble(0, 100, nTone + delta * expansionDir);
                if ((fTone - nTone) * expansionDir >= delta) ;
                else {
                    // 3rd round: contract nearer to match delta.
                    nTone = clampDouble(0, 100, fTone - delta * expansionDir);
                }
            }
            // Avoids the 50-59 awkward zone.
            if (50 <= nTone && nTone < 60) {
                // If `nearer` is in the awkward zone, move it away, together with
                // `farther`.
                if (expansionDir > 0) {
                    nTone = 60;
                    fTone = Math.max(fTone, nTone + delta * expansionDir);
                }
                else {
                    nTone = 49;
                    fTone = Math.min(fTone, nTone + delta * expansionDir);
                }
            }
            else if (50 <= fTone && fTone < 60) {
                if (stayTogether) {
                    // Fixes both, to avoid two colors on opposite sides of the "awkward
                    // zone".
                    if (expansionDir > 0) {
                        nTone = 60;
                        fTone = Math.max(fTone, nTone + delta * expansionDir);
                    }
                    else {
                        nTone = 49;
                        fTone = Math.min(fTone, nTone + delta * expansionDir);
                    }
                }
                else {
                    // Not required to stay together; fixes just one.
                    if (expansionDir > 0) {
                        fTone = 60;
                    }
                    else {
                        fTone = 49;
                    }
                }
            }
            // Returns `nTone` if this color is `nearer`, otherwise `fTone`.
            return amNearer ? nTone : fTone;
        }
        else {
            // Case 2: No contrast pair; just solve for itself.
            let answer = color.tone(scheme);
            if (color.background == undefined ||
                color.background(scheme) === undefined ||
                color.contrastCurve == undefined ||
                color.contrastCurve(scheme) === undefined) {
                return answer; // No adjustment for colors with no background.
            }
            const bgTone = color.background(scheme).getTone(scheme);
            const desiredRatio = color.contrastCurve(scheme).get(scheme.contrastLevel);
            if (Contrast.ratioOfTones(bgTone, answer) >= desiredRatio) ;
            else {
                // Rough improvement.
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }
            if (decreasingContrast) {
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }
            if (color.isBackground && 50 <= answer && answer < 60) {
                // Must adjust
                if (Contrast.ratioOfTones(49, bgTone) >= desiredRatio) {
                    answer = 49;
                }
                else {
                    answer = 60;
                }
            }
            if (color.secondBackground == undefined ||
                color.secondBackground(scheme) === undefined) {
                return answer;
            }
            // Case 3: Adjust for dual backgrounds.
            const [bg1, bg2] = [color.background, color.secondBackground];
            const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
            const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
            if (Contrast.ratioOfTones(upper, answer) >= desiredRatio &&
                Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
                return answer;
            }
            // The darkest light tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const lightOption = Contrast.lighter(upper, desiredRatio);
            // The lightest dark tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const darkOption = Contrast.darker(lower, desiredRatio);
            // Tones suitable for the foreground.
            const availables = [];
            if (lightOption !== -1)
                availables.push(lightOption);
            if (darkOption !== -1)
                availables.push(darkOption);
            const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone1) ||
                DynamicColor.tonePrefersLightForeground(bgTone2);
            if (prefersLight) {
                return (lightOption < 0) ? 100 : lightOption;
            }
            if (availables.length === 1) {
                return availables[0];
            }
            return (darkOption < 0) ? 0 : darkOption;
        }
    }
}
/**
 * A delegate for the color calculation of a DynamicScheme in the 2025 spec.
 */
class ColorCalculationDelegateImpl2025 {
    getHct(scheme, color) {
        const palette = color.palette(scheme);
        const tone = color.getTone(scheme);
        const hue = palette.hue;
        const chroma = palette.chroma *
            (color.chromaMultiplier ? color.chromaMultiplier(scheme) : 1);
        return Hct.from(hue, chroma, tone);
    }
    getTone(scheme, color) {
        const toneDeltaPair = color.toneDeltaPair ? color.toneDeltaPair(scheme) : undefined;
        // Case 0: tone delta constraint.
        if (toneDeltaPair) {
            const roleA = toneDeltaPair.roleA;
            const roleB = toneDeltaPair.roleB;
            const polarity = toneDeltaPair.polarity;
            const constraint = toneDeltaPair.constraint;
            const absoluteDelta = polarity === 'darker' ||
                (polarity === 'relative_lighter' && scheme.isDark) ||
                (polarity === 'relative_darker' && !scheme.isDark) ?
                -toneDeltaPair.delta :
                toneDeltaPair.delta;
            const amRoleA = color.name === roleA.name;
            const selfRole = amRoleA ? roleA : roleB;
            const refRole = amRoleA ? roleB : roleA;
            let selfTone = selfRole.tone(scheme);
            let refTone = refRole.getTone(scheme);
            const relativeDelta = absoluteDelta * (amRoleA ? 1 : -1);
            if (constraint === 'exact') {
                selfTone = clampDouble(0, 100, refTone + relativeDelta);
            }
            else if (constraint === 'nearer') {
                if (relativeDelta > 0) {
                    selfTone = clampDouble(0, 100, clampDouble(refTone, refTone + relativeDelta, selfTone));
                }
                else {
                    selfTone = clampDouble(0, 100, clampDouble(refTone + relativeDelta, refTone, selfTone));
                }
            }
            else if (constraint === 'farther') {
                if (relativeDelta > 0) {
                    selfTone = clampDouble(refTone + relativeDelta, 100, selfTone);
                }
                else {
                    selfTone = clampDouble(0, refTone + relativeDelta, selfTone);
                }
            }
            if (color.background && color.contrastCurve) {
                const background = color.background(scheme);
                const contrastCurve = color.contrastCurve(scheme);
                if (background && contrastCurve) {
                    // Adjust the tones for contrast, if background and contrast curve
                    // are defined.
                    const bgTone = background.getTone(scheme);
                    const selfContrast = contrastCurve.get(scheme.contrastLevel);
                    selfTone = Contrast.ratioOfTones(bgTone, selfTone) >= selfContrast &&
                        scheme.contrastLevel >= 0 ?
                        selfTone :
                        DynamicColor.foregroundTone(bgTone, selfContrast);
                }
            }
            // This can avoid the awkward tones for background colors including the
            // access fixed colors. Accent fixed dim colors should not be adjusted.
            if (color.isBackground && !color.name.endsWith('_fixed_dim')) {
                if (selfTone >= 57) {
                    selfTone = clampDouble(65, 100, selfTone);
                }
                else {
                    selfTone = clampDouble(0, 49, selfTone);
                }
            }
            return selfTone;
        }
        else {
            // Case 1: No tone delta pair; just solve for itself.
            let answer = color.tone(scheme);
            if (color.background == undefined ||
                color.background(scheme) === undefined ||
                color.contrastCurve == undefined ||
                color.contrastCurve(scheme) === undefined) {
                return answer; // No adjustment for colors with no background.
            }
            const bgTone = color.background(scheme).getTone(scheme);
            const desiredRatio = color.contrastCurve(scheme).get(scheme.contrastLevel);
            // Recalculate the tone from desired contrast ratio if the current
            // contrast ratio is not enough or desired contrast level is decreasing
            // (<0).
            answer = Contrast.ratioOfTones(bgTone, answer) >= desiredRatio &&
                scheme.contrastLevel >= 0 ?
                answer :
                DynamicColor.foregroundTone(bgTone, desiredRatio);
            // This can avoid the awkward tones for background colors including the
            // access fixed colors. Accent fixed dim colors should not be adjusted.
            if (color.isBackground && !color.name.endsWith('_fixed_dim')) {
                if (answer >= 57) {
                    answer = clampDouble(65, 100, answer);
                }
                else {
                    answer = clampDouble(0, 49, answer);
                }
            }
            if (color.secondBackground == undefined ||
                color.secondBackground(scheme) === undefined) {
                return answer;
            }
            // Case 2: Adjust for dual backgrounds.
            const [bg1, bg2] = [color.background, color.secondBackground];
            const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
            const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
            if (Contrast.ratioOfTones(upper, answer) >= desiredRatio &&
                Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
                return answer;
            }
            // The darkest light tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const lightOption = Contrast.lighter(upper, desiredRatio);
            // The lightest dark tone that satisfies the desired ratio,
            // or -1 if such ratio cannot be reached.
            const darkOption = Contrast.darker(lower, desiredRatio);
            // Tones suitable for the foreground.
            const availables = [];
            if (lightOption !== -1)
                availables.push(lightOption);
            if (darkOption !== -1)
                availables.push(darkOption);
            const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone1) ||
                DynamicColor.tonePrefersLightForeground(bgTone2);
            if (prefersLight) {
                return (lightOption < 0) ? 100 : lightOption;
            }
            if (availables.length === 1) {
                return availables[0];
            }
            return (darkOption < 0) ? 0 : darkOption;
        }
    }
}
const spec2021$1 = new ColorCalculationDelegateImpl2021();
const spec2025$1 = new ColorCalculationDelegateImpl2025();
/**
 * Returns the ColorCalculationDelegate for the given spec version.
 */
function getSpec$1(specVersion) {
    return specVersion === '2025' ? spec2025$1 : spec2021$1;
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *  A convenience class for retrieving colors that are constant in hue and
 *  chroma, but vary in tone.
 */
class TonalPalette {
    /**
     * @param argb ARGB representation of a color
     * @return Tones matching that color's hue and chroma.
     */
    static fromInt(argb) {
        const hct = Hct.fromInt(argb);
        return TonalPalette.fromHct(hct);
    }
    /**
     * @param hct Hct
     * @return Tones matching that color's hue and chroma.
     */
    static fromHct(hct) {
        return new TonalPalette(hct.hue, hct.chroma, hct);
    }
    /**
     * @param hue HCT hue
     * @param chroma HCT chroma
     * @return Tones matching hue and chroma.
     */
    static fromHueAndChroma(hue, chroma) {
        const keyColor = new KeyColor(hue, chroma).create();
        return new TonalPalette(hue, chroma, keyColor);
    }
    constructor(hue, chroma, keyColor) {
        this.hue = hue;
        this.chroma = chroma;
        this.keyColor = keyColor;
        this.cache = new Map();
    }
    /**
     * @param tone HCT tone, measured from 0 to 100.
     * @return ARGB representation of a color with that tone.
     */
    tone(tone) {
        let argb = this.cache.get(tone);
        if (argb === undefined) {
            if (tone == 99 && Hct.isYellow(this.hue)) {
                argb = this.averageArgb(this.tone(98), this.tone(100));
            }
            else {
                argb = Hct.from(this.hue, this.chroma, tone).toInt();
            }
            this.cache.set(tone, argb);
        }
        return argb;
    }
    /**
     * @param tone HCT tone.
     * @return HCT representation of a color with that tone.
     */
    getHct(tone) {
        return Hct.fromInt(this.tone(tone));
    }
    averageArgb(argb1, argb2) {
        const red1 = (argb1 >>> 16) & 0xff;
        const green1 = (argb1 >>> 8) & 0xff;
        const blue1 = argb1 & 0xff;
        const red2 = (argb2 >>> 16) & 0xff;
        const green2 = (argb2 >>> 8) & 0xff;
        const blue2 = argb2 & 0xff;
        const red = Math.round((red1 + red2) / 2);
        const green = Math.round((green1 + green2) / 2);
        const blue = Math.round((blue1 + blue2) / 2);
        return (255 << 24 | (red & 255) << 16 | (green & 255) << 8 |
            (blue & 255)) >>>
            0;
    }
}
/**
 * Key color is a color that represents the hue and chroma of a tonal palette
 */
class KeyColor {
    constructor(hue, requestedChroma) {
        this.hue = hue;
        this.requestedChroma = requestedChroma;
        // Cache that maps tone to max chroma to avoid duplicated HCT calculation.
        this.chromaCache = new Map();
        this.maxChromaValue = 200.0;
    }
    /**
     * Creates a key color from a [hue] and a [chroma].
     * The key color is the first tone, starting from T50, matching the given hue
     * and chroma.
     *
     * @return Key color [Hct]
     */
    create() {
        // Pivot around T50 because T50 has the most chroma available, on
        // average. Thus it is most likely to have a direct answer.
        const pivotTone = 50;
        const toneStepSize = 1;
        // Epsilon to accept values slightly higher than the requested chroma.
        const epsilon = 0.01;
        // Binary search to find the tone that can provide a chroma that is closest
        // to the requested chroma.
        let lowerTone = 0;
        let upperTone = 100;
        while (lowerTone < upperTone) {
            const midTone = Math.floor((lowerTone + upperTone) / 2);
            const isAscending = this.maxChroma(midTone) < this.maxChroma(midTone + toneStepSize);
            const sufficientChroma = this.maxChroma(midTone) >= this.requestedChroma - epsilon;
            if (sufficientChroma) {
                // Either range [lowerTone, midTone] or [midTone, upperTone] has
                // the answer, so search in the range that is closer the pivot tone.
                if (Math.abs(lowerTone - pivotTone) < Math.abs(upperTone - pivotTone)) {
                    upperTone = midTone;
                }
                else {
                    if (lowerTone === midTone) {
                        return Hct.from(this.hue, this.requestedChroma, lowerTone);
                    }
                    lowerTone = midTone;
                }
            }
            else {
                // As there is no sufficient chroma in the midTone, follow the direction
                // to the chroma peak.
                if (isAscending) {
                    lowerTone = midTone + toneStepSize;
                }
                else {
                    // Keep midTone for potential chroma peak.
                    upperTone = midTone;
                }
            }
        }
        return Hct.from(this.hue, this.requestedChroma, lowerTone);
    }
    // Find the maximum chroma for a given tone
    maxChroma(tone) {
        if (this.chromaCache.has(tone)) {
            return this.chromaCache.get(tone);
        }
        const chroma = Hct.from(this.hue, this.maxChromaValue, tone).chroma;
        this.chromaCache.set(tone, chroma);
        return chroma;
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// This file is automatically generated. Do not modify it.
/**
 * Design utilities using color temperature theory.
 *
 * Analogous colors, complementary color, and cache to efficiently, lazily,
 * generate data for calculations when needed.
 */
class TemperatureCache {
    constructor(input) {
        this.input = input;
        this.hctsByTempCache = [];
        this.hctsByHueCache = [];
        this.tempsByHctCache = new Map();
        this.inputRelativeTemperatureCache = -1;
        this.complementCache = null;
    }
    get hctsByTemp() {
        if (this.hctsByTempCache.length > 0) {
            return this.hctsByTempCache;
        }
        const hcts = this.hctsByHue.concat([this.input]);
        const temperaturesByHct = this.tempsByHct;
        hcts.sort((a, b) => temperaturesByHct.get(a) - temperaturesByHct.get(b));
        this.hctsByTempCache = hcts;
        return hcts;
    }
    get warmest() {
        return this.hctsByTemp[this.hctsByTemp.length - 1];
    }
    get coldest() {
        return this.hctsByTemp[0];
    }
    /**
     * A set of colors with differing hues, equidistant in temperature.
     *
     * In art, this is usually described as a set of 5 colors on a color wheel
     * divided into 12 sections. This method allows provision of either of those
     * values.
     *
     * Behavior is undefined when [count] or [divisions] is 0.
     * When divisions < count, colors repeat.
     *
     * [count] The number of colors to return, includes the input color.
     * [divisions] The number of divisions on the color wheel.
     */
    analogous(count = 5, divisions = 12) {
        const startHue = Math.round(this.input.hue);
        const startHct = this.hctsByHue[startHue];
        let lastTemp = this.relativeTemperature(startHct);
        const allColors = [startHct];
        let absoluteTotalTempDelta = 0.0;
        for (let i = 0; i < 360; i++) {
            const hue = sanitizeDegreesInt(startHue + i);
            const hct = this.hctsByHue[hue];
            const temp = this.relativeTemperature(hct);
            const tempDelta = Math.abs(temp - lastTemp);
            lastTemp = temp;
            absoluteTotalTempDelta += tempDelta;
        }
        let hueAddend = 1;
        const tempStep = absoluteTotalTempDelta / divisions;
        let totalTempDelta = 0.0;
        lastTemp = this.relativeTemperature(startHct);
        while (allColors.length < divisions) {
            const hue = sanitizeDegreesInt(startHue + hueAddend);
            const hct = this.hctsByHue[hue];
            const temp = this.relativeTemperature(hct);
            const tempDelta = Math.abs(temp - lastTemp);
            totalTempDelta += tempDelta;
            const desiredTotalTempDeltaForIndex = allColors.length * tempStep;
            let indexSatisfied = totalTempDelta >= desiredTotalTempDeltaForIndex;
            let indexAddend = 1;
            // Keep adding this hue to the answers until its temperature is
            // insufficient. This ensures consistent behavior when there aren't
            // [divisions] discrete steps between 0 and 360 in hue with [tempStep]
            // delta in temperature between them.
            //
            // For example, white and black have no analogues: there are no other
            // colors at T100/T0. Therefore, they should just be added to the array
            // as answers.
            while (indexSatisfied && allColors.length < divisions) {
                allColors.push(hct);
                const desiredTotalTempDeltaForIndex = ((allColors.length + indexAddend) * tempStep);
                indexSatisfied = totalTempDelta >= desiredTotalTempDeltaForIndex;
                indexAddend++;
            }
            lastTemp = temp;
            hueAddend++;
            if (hueAddend > 360) {
                while (allColors.length < divisions) {
                    allColors.push(hct);
                }
                break;
            }
        }
        const answers = [this.input];
        // First, generate analogues from rotating counter-clockwise.
        const increaseHueCount = Math.floor((count - 1) / 2.0);
        for (let i = 1; i < (increaseHueCount + 1); i++) {
            let index = 0 - i;
            while (index < 0) {
                index = allColors.length + index;
            }
            if (index >= allColors.length) {
                index = index % allColors.length;
            }
            answers.splice(0, 0, allColors[index]);
        }
        // Second, generate analogues from rotating clockwise.
        const decreaseHueCount = count - increaseHueCount - 1;
        for (let i = 1; i < (decreaseHueCount + 1); i++) {
            let index = i;
            while (index < 0) {
                index = allColors.length + index;
            }
            if (index >= allColors.length) {
                index = index % allColors.length;
            }
            answers.push(allColors[index]);
        }
        return answers;
    }
    /**
     * A color that complements the input color aesthetically.
     *
     * In art, this is usually described as being across the color wheel.
     * History of this shows intent as a color that is just as cool-warm as the
     * input color is warm-cool.
     */
    get complement() {
        if (this.complementCache != null) {
            return this.complementCache;
        }
        const coldestHue = this.coldest.hue;
        const coldestTemp = this.tempsByHct.get(this.coldest);
        const warmestHue = this.warmest.hue;
        const warmestTemp = this.tempsByHct.get(this.warmest);
        const range = warmestTemp - coldestTemp;
        const startHueIsColdestToWarmest = TemperatureCache.isBetween(this.input.hue, coldestHue, warmestHue);
        const startHue = startHueIsColdestToWarmest ? warmestHue : coldestHue;
        const endHue = startHueIsColdestToWarmest ? coldestHue : warmestHue;
        const directionOfRotation = 1.0;
        let smallestError = 1000.0;
        let answer = this.hctsByHue[Math.round(this.input.hue)];
        const complementRelativeTemp = 1.0 - this.inputRelativeTemperature;
        // Find the color in the other section, closest to the inverse percentile
        // of the input color. This is the complement.
        for (let hueAddend = 0.0; hueAddend <= 360.0; hueAddend += 1.0) {
            const hue = sanitizeDegreesDouble(startHue + directionOfRotation * hueAddend);
            if (!TemperatureCache.isBetween(hue, startHue, endHue)) {
                continue;
            }
            const possibleAnswer = this.hctsByHue[Math.round(hue)];
            const relativeTemp = (this.tempsByHct.get(possibleAnswer) - coldestTemp) / range;
            const error = Math.abs(complementRelativeTemp - relativeTemp);
            if (error < smallestError) {
                smallestError = error;
                answer = possibleAnswer;
            }
        }
        this.complementCache = answer;
        return this.complementCache;
    }
    /**
     * Temperature relative to all colors with the same chroma and tone.
     * Value on a scale from 0 to 1.
     */
    relativeTemperature(hct) {
        const range = this.tempsByHct.get(this.warmest) - this.tempsByHct.get(this.coldest);
        const differenceFromColdest = this.tempsByHct.get(hct) - this.tempsByHct.get(this.coldest);
        // Handle when there's no difference in temperature between warmest and
        // coldest: for example, at T100, only one color is available, white.
        if (range === 0.0) {
            return 0.5;
        }
        return differenceFromColdest / range;
    }
    /** Relative temperature of the input color. See [relativeTemperature]. */
    get inputRelativeTemperature() {
        if (this.inputRelativeTemperatureCache >= 0.0) {
            return this.inputRelativeTemperatureCache;
        }
        this.inputRelativeTemperatureCache = this.relativeTemperature(this.input);
        return this.inputRelativeTemperatureCache;
    }
    /** A Map with keys of HCTs in [hctsByTemp], values of raw temperature. */
    get tempsByHct() {
        if (this.tempsByHctCache.size > 0) {
            return this.tempsByHctCache;
        }
        const allHcts = this.hctsByHue.concat([this.input]);
        const temperaturesByHct = new Map();
        for (const e of allHcts) {
            temperaturesByHct.set(e, TemperatureCache.rawTemperature(e));
        }
        this.tempsByHctCache = temperaturesByHct;
        return temperaturesByHct;
    }
    /**
     * HCTs for all hues, with the same chroma/tone as the input.
     * Sorted ascending, hue 0 to 360.
     */
    get hctsByHue() {
        if (this.hctsByHueCache.length > 0) {
            return this.hctsByHueCache;
        }
        const hcts = [];
        for (let hue = 0.0; hue <= 360.0; hue += 1.0) {
            const colorAtHue = Hct.from(hue, this.input.chroma, this.input.tone);
            hcts.push(colorAtHue);
        }
        this.hctsByHueCache = hcts;
        return this.hctsByHueCache;
    }
    /** Determines if an angle is between two other angles, rotating clockwise. */
    static isBetween(angle, a, b) {
        if (a < b) {
            return a <= angle && angle <= b;
        }
        return a <= angle || angle <= b;
    }
    /**
     * Value representing cool-warm factor of a color.
     * Values below 0 are considered cool, above, warm.
     *
     * Color science has researched emotion and harmony, which art uses to select
     * colors. Warm-cool is the foundation of analogous and complementary colors.
     * See:
     * - Li-Chen Ou's Chapter 19 in Handbook of Color Psychology (2015).
     * - Josef Albers' Interaction of Color chapters 19 and 21.
     *
     * Implementation of Ou, Woodcock and Wright's algorithm, which uses
     * L*a*b* / LCH color space.
     * Return value has these properties:
     * - Values below 0 are cool, above 0 are warm.
     * - Lower bound: -0.52 - (chroma ^ 1.07 / 20). L*a*b* chroma is infinite.
     *   Assuming max of 130 chroma, -9.66.
     * - Upper bound: -0.52 + (chroma ^ 1.07 / 20). L*a*b* chroma is infinite.
     *   Assuming max of 130 chroma, 8.61.
     */
    static rawTemperature(color) {
        const lab = labFromArgb(color.toInt());
        const hue = sanitizeDegreesDouble(Math.atan2(lab[2], lab[1]) * 180.0 / Math.PI);
        const chroma = Math.sqrt((lab[1] * lab[1]) + (lab[2] * lab[2]));
        const temperature = -0.5 +
            0.02 * Math.pow(chroma, 1.07) *
                Math.cos(sanitizeDegreesDouble(hue - 50.0) * Math.PI / 180.0);
        return temperature;
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A class containing a value that changes with the contrast level.
 *
 * Usually represents the contrast requirements for a dynamic color on its
 * background. The four values correspond to values for contrast levels -1.0,
 * 0.0, 0.5, and 1.0, respectively.
 */
class ContrastCurve {
    /**
     * Creates a `ContrastCurve` object.
     *
     * @param low Value for contrast level -1.0
     * @param normal Value for contrast level 0.0
     * @param medium Value for contrast level 0.5
     * @param high Value for contrast level 1.0
     */
    constructor(low, normal, medium, high) {
        this.low = low;
        this.normal = normal;
        this.medium = medium;
        this.high = high;
    }
    /**
     * Returns the value at a given contrast level.
     *
     * @param contrastLevel The contrast level. 0.0 is the default (normal); -1.0
     *     is the lowest; 1.0 is the highest.
     * @return The value. For contrast ratios, a number between 1.0 and 21.0.
     */
    get(contrastLevel) {
        if (contrastLevel <= -1) {
            return this.low;
        }
        else if (contrastLevel < 0.0) {
            return lerp(this.low, this.normal, (contrastLevel - (-1)) / 1);
        }
        else if (contrastLevel < 0.5) {
            return lerp(this.normal, this.medium, (contrastLevel - 0) / 0.5);
        }
        else if (contrastLevel < 1.0) {
            return lerp(this.medium, this.high, (contrastLevel - 0.5) / 0.5);
        }
        else {
            return this.high;
        }
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Documents a constraint between two DynamicColors, in which their tones must
 * have a certain distance from each other.
 *
 * Prefer a DynamicColor with a background, this is for special cases when
 * designers want tonal distance, literally contrast, between two colors that
 * don't have a background / foreground relationship or a contrast guarantee.
 */
class ToneDeltaPair {
    /**
     * Documents a constraint in tone distance between two DynamicColors.
     *
     * The polarity is an adjective that describes "A", compared to "B".
     *
     * For instance, ToneDeltaPair(A, B, 15, 'darker', 'exact') states that
     * A's tone should be exactly 15 darker than B's.
     *
     * 'relative_darker' and 'relative_lighter' describes the tone adjustment
     * relative to the surface color trend (white in light mode; black in dark
     * mode). For instance, ToneDeltaPair(A, B, 10, 'relative_lighter',
     * 'farther') states that A should be at least 10 lighter than B in light
     * mode, and at least 10 darker than B in dark mode.
     *
     * @param roleA The first role in a pair.
     * @param roleB The second role in a pair.
     * @param delta Required difference between tones. Absolute value, negative
     * values have undefined behavior.
     * @param polarity The relative relation between tones of roleA and roleB,
     * as described above.
     * @param constraint How to fulfill the tone delta pair constraint.
     * @param stayTogether Whether these two roles should stay on the same side
     * of the "awkward zone" (T50-59). This is necessary for certain cases where
     * one role has two backgrounds.
     */
    constructor(roleA, roleB, delta, polarity, stayTogether, constraint) {
        this.roleA = roleA;
        this.roleB = roleB;
        this.delta = delta;
        this.polarity = polarity;
        this.stayTogether = stayTogether;
        this.constraint = constraint;
        this.constraint = constraint ?? 'exact';
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Set of themes supported by Dynamic Color.
 * Instantiate the corresponding subclass, ex. SchemeTonalSpot, to create
 * colors corresponding to the theme.
 */
var Variant;
(function (Variant) {
    Variant[Variant["MONOCHROME"] = 0] = "MONOCHROME";
    Variant[Variant["NEUTRAL"] = 1] = "NEUTRAL";
    Variant[Variant["TONAL_SPOT"] = 2] = "TONAL_SPOT";
    Variant[Variant["VIBRANT"] = 3] = "VIBRANT";
    Variant[Variant["EXPRESSIVE"] = 4] = "EXPRESSIVE";
    Variant[Variant["FIDELITY"] = 5] = "FIDELITY";
    Variant[Variant["CONTENT"] = 6] = "CONTENT";
    Variant[Variant["RAINBOW"] = 7] = "RAINBOW";
    Variant[Variant["FRUIT_SALAD"] = 8] = "FRUIT_SALAD";
})(Variant || (Variant = {}));

/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns true if the scheme is Fidelity or Content.
 */
function isFidelity(scheme) {
    return scheme.variant === Variant.FIDELITY ||
        scheme.variant === Variant.CONTENT;
}
/**
 * Returns true if the scheme is Monochrome.
 */
function isMonochrome(scheme) {
    return scheme.variant === Variant.MONOCHROME;
}
/**
 * Returns the desired chroma for a given tone at a specific hue.
 *
 * @param hue The given hue.
 * @param chroma The target chroma.
 * @param tone The tone to start with.
 * @param byDecreasingTone Whether to search for lower tones.
 */
function findDesiredChromaByTone(hue, chroma, tone, byDecreasingTone) {
    let answer = tone;
    let closestToChroma = Hct.from(hue, chroma, tone);
    if (closestToChroma.chroma < chroma) {
        let chromaPeak = closestToChroma.chroma;
        while (closestToChroma.chroma < chroma) {
            answer += byDecreasingTone ? -1 : 1.0;
            const potentialSolution = Hct.from(hue, chroma, answer);
            if (chromaPeak > potentialSolution.chroma) {
                break;
            }
            if (Math.abs(potentialSolution.chroma - chroma) < 0.4) {
                break;
            }
            const potentialDelta = Math.abs(potentialSolution.chroma - chroma);
            const currentDelta = Math.abs(closestToChroma.chroma - chroma);
            if (potentialDelta < currentDelta) {
                closestToChroma = potentialSolution;
            }
            chromaPeak = Math.max(chromaPeak, potentialSolution.chroma);
        }
    }
    return answer;
}
/**
 * A delegate for the dynamic color spec of a DynamicScheme in the 2021 spec.
 */
class ColorSpecDelegateImpl2021 {
    ////////////////////////////////////////////////////////////////
    // Main Palettes                                              //
    ////////////////////////////////////////////////////////////////
    primaryPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'primary_palette_key_color',
            palette: (s) => s.primaryPalette,
            tone: (s) => s.primaryPalette.keyColor.tone,
        });
    }
    secondaryPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'secondary_palette_key_color',
            palette: (s) => s.secondaryPalette,
            tone: (s) => s.secondaryPalette.keyColor.tone,
        });
    }
    tertiaryPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'tertiary_palette_key_color',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => s.tertiaryPalette.keyColor.tone,
        });
    }
    neutralPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'neutral_palette_key_color',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.neutralPalette.keyColor.tone,
        });
    }
    neutralVariantPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'neutral_variant_palette_key_color',
            palette: (s) => s.neutralVariantPalette,
            tone: (s) => s.neutralVariantPalette.keyColor.tone,
        });
    }
    errorPaletteKeyColor() {
        return DynamicColor.fromPalette({
            name: 'error_palette_key_color',
            palette: (s) => s.errorPalette,
            tone: (s) => s.errorPalette.keyColor.tone,
        });
    }
    ////////////////////////////////////////////////////////////////
    // Surfaces [S]                                               //
    ////////////////////////////////////////////////////////////////
    background() {
        return DynamicColor.fromPalette({
            name: 'background',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 6 : 98,
            isBackground: true,
        });
    }
    onBackground() {
        return DynamicColor.fromPalette({
            name: 'on_background',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 90 : 10,
            background: (s) => this.background(),
            contrastCurve: (s) => new ContrastCurve(3, 3, 4.5, 7),
        });
    }
    surface() {
        return DynamicColor.fromPalette({
            name: 'surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 6 : 98,
            isBackground: true,
        });
    }
    surfaceDim() {
        return DynamicColor.fromPalette({
            name: 'surface_dim',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 6 : new ContrastCurve(87, 87, 80, 75).get(s.contrastLevel),
            isBackground: true,
        });
    }
    surfaceBright() {
        return DynamicColor.fromPalette({
            name: 'surface_bright',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ?
                new ContrastCurve(24, 24, 29, 34).get(s.contrastLevel) :
                98,
            isBackground: true,
        });
    }
    surfaceContainerLowest() {
        return DynamicColor.fromPalette({
            name: 'surface_container_lowest',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? new ContrastCurve(4, 4, 2, 0).get(s.contrastLevel) : 100,
            isBackground: true,
        });
    }
    surfaceContainerLow() {
        return DynamicColor.fromPalette({
            name: 'surface_container_low',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ?
                new ContrastCurve(10, 10, 11, 12).get(s.contrastLevel) :
                new ContrastCurve(96, 96, 96, 95).get(s.contrastLevel),
            isBackground: true,
        });
    }
    surfaceContainer() {
        return DynamicColor.fromPalette({
            name: 'surface_container',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ?
                new ContrastCurve(12, 12, 16, 20).get(s.contrastLevel) :
                new ContrastCurve(94, 94, 92, 90).get(s.contrastLevel),
            isBackground: true,
        });
    }
    surfaceContainerHigh() {
        return DynamicColor.fromPalette({
            name: 'surface_container_high',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ?
                new ContrastCurve(17, 17, 21, 25).get(s.contrastLevel) :
                new ContrastCurve(92, 92, 88, 85).get(s.contrastLevel),
            isBackground: true,
        });
    }
    surfaceContainerHighest() {
        return DynamicColor.fromPalette({
            name: 'surface_container_highest',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ?
                new ContrastCurve(22, 22, 26, 30).get(s.contrastLevel) :
                new ContrastCurve(90, 90, 84, 80).get(s.contrastLevel),
            isBackground: true,
        });
    }
    onSurface() {
        return DynamicColor.fromPalette({
            name: 'on_surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 90 : 10,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    surfaceVariant() {
        return DynamicColor.fromPalette({
            name: 'surface_variant',
            palette: (s) => s.neutralVariantPalette,
            tone: (s) => s.isDark ? 30 : 90,
            isBackground: true,
        });
    }
    onSurfaceVariant() {
        return DynamicColor.fromPalette({
            name: 'on_surface_variant',
            palette: (s) => s.neutralVariantPalette,
            tone: (s) => s.isDark ? 80 : 30,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    inverseSurface() {
        return DynamicColor.fromPalette({
            name: 'inverse_surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 90 : 20,
            isBackground: true,
        });
    }
    inverseOnSurface() {
        return DynamicColor.fromPalette({
            name: 'inverse_on_surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 20 : 95,
            background: (s) => this.inverseSurface(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    outline() {
        return DynamicColor.fromPalette({
            name: 'outline',
            palette: (s) => s.neutralVariantPalette,
            tone: (s) => s.isDark ? 60 : 50,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1.5, 3, 4.5, 7),
        });
    }
    outlineVariant() {
        return DynamicColor.fromPalette({
            name: 'outline_variant',
            palette: (s) => s.neutralVariantPalette,
            tone: (s) => s.isDark ? 30 : 80,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
        });
    }
    shadow() {
        return DynamicColor.fromPalette({
            name: 'shadow',
            palette: (s) => s.neutralPalette,
            tone: (s) => 0,
        });
    }
    scrim() {
        return DynamicColor.fromPalette({
            name: 'scrim',
            palette: (s) => s.neutralPalette,
            tone: (s) => 0,
        });
    }
    surfaceTint() {
        return DynamicColor.fromPalette({
            name: 'surface_tint',
            palette: (s) => s.primaryPalette,
            tone: (s) => s.isDark ? 80 : 40,
            isBackground: true,
        });
    }
    ////////////////////////////////////////////////////////////////
    // Primary [P].                                               //
    ////////////////////////////////////////////////////////////////
    primary() {
        return DynamicColor.fromPalette({
            name: 'primary',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 100 : 0;
                }
                return s.isDark ? 80 : 40;
            },
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 7),
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryContainer(), this.primary(), 10, 'nearer', false),
        });
    }
    primaryDim() {
        return undefined;
    }
    onPrimary() {
        return DynamicColor.fromPalette({
            name: 'on_primary',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 10 : 90;
                }
                return s.isDark ? 20 : 100;
            },
            background: (s) => this.primary(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    primaryContainer() {
        return DynamicColor.fromPalette({
            name: 'primary_container',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (isFidelity(s)) {
                    return s.sourceColorHct.tone;
                }
                if (isMonochrome(s)) {
                    return s.isDark ? 85 : 25;
                }
                return s.isDark ? 30 : 90;
            },
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryContainer(), this.primary(), 10, 'nearer', false),
        });
    }
    onPrimaryContainer() {
        return DynamicColor.fromPalette({
            name: 'on_primary_container',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (isFidelity(s)) {
                    return DynamicColor.foregroundTone(this.primaryContainer().tone(s), 4.5);
                }
                if (isMonochrome(s)) {
                    return s.isDark ? 0 : 100;
                }
                return s.isDark ? 90 : 30;
            },
            background: (s) => this.primaryContainer(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    inversePrimary() {
        return DynamicColor.fromPalette({
            name: 'inverse_primary',
            palette: (s) => s.primaryPalette,
            tone: (s) => s.isDark ? 40 : 80,
            background: (s) => this.inverseSurface(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 7),
        });
    }
    /////////////////////////////////////////////////////////////////
    // Secondary [Q].                                              //
    /////////////////////////////////////////////////////////////////
    secondary() {
        return DynamicColor.fromPalette({
            name: 'secondary',
            palette: (s) => s.secondaryPalette,
            tone: (s) => s.isDark ? 80 : 40,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 7),
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryContainer(), this.secondary(), 10, 'nearer', false),
        });
    }
    secondaryDim() {
        return undefined;
    }
    onSecondary() {
        return DynamicColor.fromPalette({
            name: 'on_secondary',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 10 : 100;
                }
                else {
                    return s.isDark ? 20 : 100;
                }
            },
            background: (s) => this.secondary(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    secondaryContainer() {
        return DynamicColor.fromPalette({
            name: 'secondary_container',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                const initialTone = s.isDark ? 30 : 90;
                if (isMonochrome(s)) {
                    return s.isDark ? 30 : 85;
                }
                if (!isFidelity(s)) {
                    return initialTone;
                }
                return findDesiredChromaByTone(s.secondaryPalette.hue, s.secondaryPalette.chroma, initialTone, s.isDark ? false : true);
            },
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryContainer(), this.secondary(), 10, 'nearer', false),
        });
    }
    onSecondaryContainer() {
        return DynamicColor.fromPalette({
            name: 'on_secondary_container',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 90 : 10;
                }
                if (!isFidelity(s)) {
                    return s.isDark ? 90 : 30;
                }
                return DynamicColor.foregroundTone(this.secondaryContainer().tone(s), 4.5);
            },
            background: (s) => this.secondaryContainer(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    /////////////////////////////////////////////////////////////////
    // Tertiary [T].                                               //
    /////////////////////////////////////////////////////////////////
    tertiary() {
        return DynamicColor.fromPalette({
            name: 'tertiary',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 90 : 25;
                }
                return s.isDark ? 80 : 40;
            },
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 7),
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryContainer(), this.tertiary(), 10, 'nearer', false),
        });
    }
    tertiaryDim() {
        return undefined;
    }
    onTertiary() {
        return DynamicColor.fromPalette({
            name: 'on_tertiary',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 10 : 90;
                }
                return s.isDark ? 20 : 100;
            },
            background: (s) => this.tertiary(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    tertiaryContainer() {
        return DynamicColor.fromPalette({
            name: 'tertiary_container',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 60 : 49;
                }
                if (!isFidelity(s)) {
                    return s.isDark ? 30 : 90;
                }
                const proposedHct = s.tertiaryPalette.getHct(s.sourceColorHct.tone);
                return DislikeAnalyzer.fixIfDisliked(proposedHct).tone;
            },
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryContainer(), this.tertiary(), 10, 'nearer', false),
        });
    }
    onTertiaryContainer() {
        return DynamicColor.fromPalette({
            name: 'on_tertiary_container',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 0 : 100;
                }
                if (!isFidelity(s)) {
                    return s.isDark ? 90 : 30;
                }
                return DynamicColor.foregroundTone(this.tertiaryContainer().tone(s), 4.5);
            },
            background: (s) => this.tertiaryContainer(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    //////////////////////////////////////////////////////////////////
    // Error [E].                                                   //
    //////////////////////////////////////////////////////////////////
    error() {
        return DynamicColor.fromPalette({
            name: 'error',
            palette: (s) => s.errorPalette,
            tone: (s) => s.isDark ? 80 : 40,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 7),
            toneDeltaPair: (s) => new ToneDeltaPair(this.errorContainer(), this.error(), 10, 'nearer', false),
        });
    }
    errorDim() {
        return undefined;
    }
    onError() {
        return DynamicColor.fromPalette({
            name: 'on_error',
            palette: (s) => s.errorPalette,
            tone: (s) => s.isDark ? 20 : 100,
            background: (s) => this.error(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    errorContainer() {
        return DynamicColor.fromPalette({
            name: 'error_container',
            palette: (s) => s.errorPalette,
            tone: (s) => s.isDark ? 30 : 90,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.errorContainer(), this.error(), 10, 'nearer', false),
        });
    }
    onErrorContainer() {
        return DynamicColor.fromPalette({
            name: 'on_error_container',
            palette: (s) => s.errorPalette,
            tone: (s) => {
                if (isMonochrome(s)) {
                    return s.isDark ? 90 : 10;
                }
                return s.isDark ? 90 : 30;
            },
            background: (s) => this.errorContainer(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    //////////////////////////////////////////////////////////////////
    // Primary Fixed [PF]                                           //
    //////////////////////////////////////////////////////////////////
    primaryFixed() {
        return DynamicColor.fromPalette({
            name: 'primary_fixed',
            palette: (s) => s.primaryPalette,
            tone: (s) => isMonochrome(s) ? 40.0 : 90.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryFixed(), this.primaryFixedDim(), 10, 'lighter', true),
        });
    }
    primaryFixedDim() {
        return DynamicColor.fromPalette({
            name: 'primary_fixed_dim',
            palette: (s) => s.primaryPalette,
            tone: (s) => isMonochrome(s) ? 30.0 : 80.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryFixed(), this.primaryFixedDim(), 10, 'lighter', true),
        });
    }
    onPrimaryFixed() {
        return DynamicColor.fromPalette({
            name: 'on_primary_fixed',
            palette: (s) => s.primaryPalette,
            tone: (s) => isMonochrome(s) ? 100.0 : 10.0,
            background: (s) => this.primaryFixedDim(),
            secondBackground: (s) => this.primaryFixed(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    onPrimaryFixedVariant() {
        return DynamicColor.fromPalette({
            name: 'on_primary_fixed_variant',
            palette: (s) => s.primaryPalette,
            tone: (s) => isMonochrome(s) ? 90.0 : 30.0,
            background: (s) => this.primaryFixedDim(),
            secondBackground: (s) => this.primaryFixed(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    ///////////////////////////////////////////////////////////////////
    // Secondary Fixed [QF]                                          //
    ///////////////////////////////////////////////////////////////////
    secondaryFixed() {
        return DynamicColor.fromPalette({
            name: 'secondary_fixed',
            palette: (s) => s.secondaryPalette,
            tone: (s) => isMonochrome(s) ? 80.0 : 90.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryFixed(), this.secondaryFixedDim(), 10, 'lighter', true),
        });
    }
    secondaryFixedDim() {
        return DynamicColor.fromPalette({
            name: 'secondary_fixed_dim',
            palette: (s) => s.secondaryPalette,
            tone: (s) => isMonochrome(s) ? 70.0 : 80.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryFixed(), this.secondaryFixedDim(), 10, 'lighter', true),
        });
    }
    onSecondaryFixed() {
        return DynamicColor.fromPalette({
            name: 'on_secondary_fixed',
            palette: (s) => s.secondaryPalette,
            tone: (s) => 10.0,
            background: (s) => this.secondaryFixedDim(),
            secondBackground: (s) => this.secondaryFixed(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    onSecondaryFixedVariant() {
        return DynamicColor.fromPalette({
            name: 'on_secondary_fixed_variant',
            palette: (s) => s.secondaryPalette,
            tone: (s) => isMonochrome(s) ? 25.0 : 30.0,
            background: (s) => this.secondaryFixedDim(),
            secondBackground: (s) => this.secondaryFixed(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    /////////////////////////////////////////////////////////////////
    // Tertiary Fixed [TF]                                         //
    /////////////////////////////////////////////////////////////////
    tertiaryFixed() {
        return DynamicColor.fromPalette({
            name: 'tertiary_fixed',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => isMonochrome(s) ? 40.0 : 90.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryFixed(), this.tertiaryFixedDim(), 10, 'lighter', true),
        });
    }
    tertiaryFixedDim() {
        return DynamicColor.fromPalette({
            name: 'tertiary_fixed_dim',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => isMonochrome(s) ? 30.0 : 80.0,
            isBackground: true,
            background: (s) => this.highestSurface(s),
            contrastCurve: (s) => new ContrastCurve(1, 1, 3, 4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryFixed(), this.tertiaryFixedDim(), 10, 'lighter', true),
        });
    }
    onTertiaryFixed() {
        return DynamicColor.fromPalette({
            name: 'on_tertiary_fixed',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => isMonochrome(s) ? 100.0 : 10.0,
            background: (s) => this.tertiaryFixedDim(),
            secondBackground: (s) => this.tertiaryFixed(),
            contrastCurve: (s) => new ContrastCurve(4.5, 7, 11, 21),
        });
    }
    onTertiaryFixedVariant() {
        return DynamicColor.fromPalette({
            name: 'on_tertiary_fixed_variant',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => isMonochrome(s) ? 90.0 : 30.0,
            background: (s) => this.tertiaryFixedDim(),
            secondBackground: (s) => this.tertiaryFixed(),
            contrastCurve: (s) => new ContrastCurve(3, 4.5, 7, 11),
        });
    }
    ////////////////////////////////////////////////////////////////
    // Other                                                      //
    ////////////////////////////////////////////////////////////////
    highestSurface(s) {
        return s.isDark ? this.surfaceBright() : this.surfaceDim();
    }
}

/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns the maximum tone for a given chroma in the palette.
 *
 * @param palette The tonal palette to use.
 * @param lowerBound The lower bound of the tone.
 * @param upperBound The upper bound of the tone.
 */
function tMaxC(palette, lowerBound = 0, upperBound = 100, chromaMultiplier = 1) {
    let answer = findBestToneForChroma(palette.hue, palette.chroma * chromaMultiplier, 100, true);
    return clampDouble(lowerBound, upperBound, answer);
}
/**
 * Returns the minimum tone for a given chroma in the palette.
 *
 * @param palette The tonal palette to use.
 * @param lowerBound The lower bound of the tone.
 * @param upperBound The upper bound of the tone.
 */
function tMinC(palette, lowerBound = 0, upperBound = 100) {
    let answer = findBestToneForChroma(palette.hue, palette.chroma, 0, false);
    return clampDouble(lowerBound, upperBound, answer);
}
/**
 * Searches for the best tone with a given chroma from a given tone at a
 * specific hue.
 *
 * @param hue The given hue.
 * @param chroma The target chroma.
 * @param tone The tone to start with.
 * @param byDecreasingTone Whether to search for lower tones.
 */
function findBestToneForChroma(hue, chroma, tone, byDecreasingTone) {
    let answer = tone;
    let bestCandidate = Hct.from(hue, chroma, answer);
    while (bestCandidate.chroma < chroma) {
        if (tone < 0 || tone > 100) {
            break;
        }
        tone += byDecreasingTone ? -1 : 1.0;
        const newCandidate = Hct.from(hue, chroma, tone);
        if (bestCandidate.chroma < newCandidate.chroma) {
            bestCandidate = newCandidate;
            answer = tone;
        }
    }
    return answer;
}
/**
 * Returns the contrast curve for a given default contrast.
 *
 * @param defaultContrast The default contrast to use.
 */
function getCurve(defaultContrast) {
    if (defaultContrast === 1.5) {
        return new ContrastCurve(1.5, 1.5, 3, 5.5);
    }
    else if (defaultContrast === 3) {
        return new ContrastCurve(3, 3, 4.5, 7);
    }
    else if (defaultContrast === 4.5) {
        return new ContrastCurve(4.5, 4.5, 7, 11);
    }
    else if (defaultContrast === 6) {
        return new ContrastCurve(6, 6, 7, 11);
    }
    else if (defaultContrast === 7) {
        return new ContrastCurve(7, 7, 11, 21);
    }
    else if (defaultContrast === 9) {
        return new ContrastCurve(9, 9, 11, 21);
    }
    else if (defaultContrast === 11) {
        return new ContrastCurve(11, 11, 21, 21);
    }
    else if (defaultContrast === 21) {
        return new ContrastCurve(21, 21, 21, 21);
    }
    else {
        // Shouldn't happen.
        return new ContrastCurve(defaultContrast, defaultContrast, 7, 21);
    }
}
/**
 * A delegate for the dynamic color spec of a DynamicScheme in the 2025 spec.
 */
class ColorSpecDelegateImpl2025 extends ColorSpecDelegateImpl2021 {
    ////////////////////////////////////////////////////////////////
    // Surfaces [S]                                               //
    ////////////////////////////////////////////////////////////////
    surface() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                super.surface().tone(s);
                if (s.platform === 'phone') {
                    if (s.isDark) {
                        return 4;
                    }
                    else {
                        if (Hct.isYellow(s.neutralPalette.hue)) {
                            return 99;
                        }
                        else if (s.variant === Variant.VIBRANT) {
                            return 97;
                        }
                        else {
                            return 98;
                        }
                    }
                }
                else {
                    return 0;
                }
            },
            isBackground: true,
        });
        return extendSpecVersion(super.surface(), '2025', color2025);
    }
    surfaceDim() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_dim',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.isDark) {
                    return 4;
                }
                else {
                    if (Hct.isYellow(s.neutralPalette.hue)) {
                        return 90;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 85;
                    }
                    else {
                        return 87;
                    }
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (!s.isDark) {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.5;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? 2.7 : 1.75;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 1.36;
                    }
                }
                return 1;
            },
        });
        return extendSpecVersion(super.surfaceDim(), '2025', color2025);
    }
    surfaceBright() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_bright',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.isDark) {
                    return 18;
                }
                else {
                    if (Hct.isYellow(s.neutralPalette.hue)) {
                        return 99;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 97;
                    }
                    else {
                        return 98;
                    }
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (s.isDark) {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.5;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? 2.7 : 1.75;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 1.36;
                    }
                }
                return 1;
            },
        });
        return extendSpecVersion(super.surfaceBright(), '2025', color2025);
    }
    surfaceContainerLowest() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_container_lowest',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 0 : 100,
            isBackground: true,
        });
        return extendSpecVersion(super.surfaceContainerLowest(), '2025', color2025);
    }
    surfaceContainerLow() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_container_low',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.platform === 'phone') {
                    if (s.isDark) {
                        return 6;
                    }
                    else {
                        if (Hct.isYellow(s.neutralPalette.hue)) {
                            return 98;
                        }
                        else if (s.variant === Variant.VIBRANT) {
                            return 95;
                        }
                        else {
                            return 96;
                        }
                    }
                }
                else {
                    return 15;
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 1.3;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.25;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? 1.3 : 1.15;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 1.08;
                    }
                }
                return 1;
            },
        });
        return extendSpecVersion(super.surfaceContainerLow(), '2025', color2025);
    }
    surfaceContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_container',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.platform === 'phone') {
                    if (s.isDark) {
                        return 9;
                    }
                    else {
                        if (Hct.isYellow(s.neutralPalette.hue)) {
                            return 96;
                        }
                        else if (s.variant === Variant.VIBRANT) {
                            return 92;
                        }
                        else {
                            return 94;
                        }
                    }
                }
                else {
                    return 20;
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 1.6;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.4;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? 1.6 : 1.3;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 1.15;
                    }
                }
                return 1;
            },
        });
        return extendSpecVersion(super.surfaceContainer(), '2025', color2025);
    }
    surfaceContainerHigh() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_container_high',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.platform === 'phone') {
                    if (s.isDark) {
                        return 12;
                    }
                    else {
                        if (Hct.isYellow(s.neutralPalette.hue)) {
                            return 94;
                        }
                        else if (s.variant === Variant.VIBRANT) {
                            return 90;
                        }
                        else {
                            return 92;
                        }
                    }
                }
                else {
                    return 25;
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 1.9;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.5;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? 1.95 : 1.45;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 1.22;
                    }
                }
                return 1;
            },
        });
        return extendSpecVersion(super.surfaceContainerHigh(), '2025', color2025);
    }
    surfaceContainerHighest() {
        const color2025 = DynamicColor.fromPalette({
            name: 'surface_container_highest',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.isDark) {
                    return 15;
                }
                else {
                    if (Hct.isYellow(s.neutralPalette.hue)) {
                        return 92;
                    }
                    else if (s.variant === Variant.VIBRANT) {
                        return 88;
                    }
                    else {
                        return 90;
                    }
                }
            },
            isBackground: true,
            chromaMultiplier: (s) => {
                if (s.variant === Variant.NEUTRAL) {
                    return 2.2;
                }
                else if (s.variant === Variant.TONAL_SPOT) {
                    return 1.7;
                }
                else if (s.variant === Variant.EXPRESSIVE) {
                    return Hct.isYellow(s.neutralPalette.hue) ? 2.3 : 1.6;
                }
                else if (s.variant === Variant.VIBRANT) {
                    return 1.29;
                }
                else { // default
                    return 1;
                }
            },
        });
        return extendSpecVersion(super.surfaceContainerHighest(), '2025', color2025);
    }
    onSurface() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => {
                if (s.variant === Variant.VIBRANT) {
                    return tMaxC(s.neutralPalette, 0, 100, 1.1);
                }
                else {
                    // For all other variants, the initial tone should be the default
                    // tone, which is the same as the background color.
                    return DynamicColor.getInitialToneFromBackground((s) => s.platform === 'phone' ? this.highestSurface(s) :
                        this.surfaceContainerHigh())(s);
                }
            },
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.2;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? (s.isDark ? 3.0 : 2.3) :
                            1.6;
                    }
                }
                return 1;
            },
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.isDark && s.platform === 'phone' ? getCurve(11) : getCurve(9),
        });
        return extendSpecVersion(super.onSurface(), '2025', color2025);
    }
    onSurfaceVariant() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_surface_variant',
            palette: (s) => s.neutralPalette,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.2;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? (s.isDark ? 3.0 : 2.3) :
                            1.6;
                    }
                }
                return 1;
            },
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ?
                (s.isDark ? getCurve(6) : getCurve(4.5)) :
                getCurve(7),
        });
        return extendSpecVersion(super.onSurfaceVariant(), '2025', color2025);
    }
    outline() {
        const color2025 = DynamicColor.fromPalette({
            name: 'outline',
            palette: (s) => s.neutralPalette,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.2;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? (s.isDark ? 3.0 : 2.3) :
                            1.6;
                    }
                }
                return 1;
            },
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(3) : getCurve(4.5),
        });
        return extendSpecVersion(super.outline(), '2025', color2025);
    }
    outlineVariant() {
        const color2025 = DynamicColor.fromPalette({
            name: 'outline_variant',
            palette: (s) => s.neutralPalette,
            chromaMultiplier: (s) => {
                if (s.platform === 'phone') {
                    if (s.variant === Variant.NEUTRAL) {
                        return 2.2;
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return 1.7;
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return Hct.isYellow(s.neutralPalette.hue) ? (s.isDark ? 3.0 : 2.3) :
                            1.6;
                    }
                }
                return 1;
            },
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(1.5) : getCurve(3),
        });
        return extendSpecVersion(super.outlineVariant(), '2025', color2025);
    }
    inverseSurface() {
        const color2025 = DynamicColor.fromPalette({
            name: 'inverse_surface',
            palette: (s) => s.neutralPalette,
            tone: (s) => s.isDark ? 98 : 4,
            isBackground: true,
        });
        return extendSpecVersion(super.inverseSurface(), '2025', color2025);
    }
    inverseOnSurface() {
        const color2025 = DynamicColor.fromPalette({
            name: 'inverse_on_surface',
            palette: (s) => s.neutralPalette,
            background: (s) => this.inverseSurface(),
            contrastCurve: (s) => getCurve(7),
        });
        return extendSpecVersion(super.inverseOnSurface(), '2025', color2025);
    }
    ////////////////////////////////////////////////////////////////
    // Primaries [P]                                              //
    ////////////////////////////////////////////////////////////////
    primary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'primary',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (s.variant === Variant.NEUTRAL) {
                    if (s.platform === 'phone') {
                        return s.isDark ? 80 : 40;
                    }
                    else {
                        return 90;
                    }
                }
                else if (s.variant === Variant.TONAL_SPOT) {
                    if (s.platform === 'phone') {
                        if (s.isDark) {
                            return 80;
                        }
                        else {
                            return tMaxC(s.primaryPalette);
                        }
                    }
                    else {
                        return tMaxC(s.primaryPalette, 0, 90);
                    }
                }
                else if (s.variant === Variant.EXPRESSIVE) {
                    if (s.platform === 'phone') {
                        return tMaxC(s.primaryPalette, 0, Hct.isYellow(s.primaryPalette.hue) ? 25 :
                            Hct.isCyan(s.primaryPalette.hue) ? 88 :
                                98);
                    }
                    else { // WATCH
                        return tMaxC(s.primaryPalette);
                    }
                }
                else { // VIBRANT
                    if (s.platform === 'phone') {
                        return tMaxC(s.primaryPalette, 0, Hct.isCyan(s.primaryPalette.hue) ? 88 : 98);
                    }
                    else { // WATCH
                        return tMaxC(s.primaryPalette);
                    }
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(4.5) : getCurve(7),
            toneDeltaPair: (s) => s.platform === 'phone' ?
                new ToneDeltaPair(this.primaryContainer(), this.primary(), 5, 'relative_lighter', true, 'farther') :
                undefined,
        });
        return extendSpecVersion(super.primary(), '2025', color2025);
    }
    primaryDim() {
        return DynamicColor.fromPalette({
            name: 'primary_dim',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (s.variant === Variant.NEUTRAL) {
                    return 85;
                }
                else if (s.variant === Variant.TONAL_SPOT) {
                    return tMaxC(s.primaryPalette, 0, 90);
                }
                else {
                    return tMaxC(s.primaryPalette);
                }
            },
            isBackground: true,
            background: (s) => this.surfaceContainerHigh(),
            contrastCurve: (s) => getCurve(4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryDim(), this.primary(), 5, 'darker', true, 'farther'),
        });
    }
    onPrimary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_primary',
            palette: (s) => s.primaryPalette,
            background: (s) => s.platform === 'phone' ? this.primary() : this.primaryDim(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onPrimary(), '2025', color2025);
    }
    primaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'primary_container',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return 30;
                }
                else if (s.variant === Variant.NEUTRAL) {
                    return s.isDark ? 30 : 90;
                }
                else if (s.variant === Variant.TONAL_SPOT) {
                    return s.isDark ? tMinC(s.primaryPalette, 35, 93) :
                        tMaxC(s.primaryPalette, 0, 90);
                }
                else if (s.variant === Variant.EXPRESSIVE) {
                    return s.isDark ? tMaxC(s.primaryPalette, 30, 93) :
                        tMaxC(s.primaryPalette, 78, Hct.isCyan(s.primaryPalette.hue) ? 88 : 90);
                }
                else { // VIBRANT
                    return s.isDark ? tMinC(s.primaryPalette, 66, 93) :
                        tMaxC(s.primaryPalette, 66, Hct.isCyan(s.primaryPalette.hue) ? 88 : 93);
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            toneDeltaPair: (s) => s.platform === 'phone' ?
                undefined :
                new ToneDeltaPair(this.primaryContainer(), this.primaryDim(), 10, 'darker', true, 'farther'),
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.primaryContainer(), '2025', color2025);
    }
    onPrimaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_primary_container',
            palette: (s) => s.primaryPalette,
            background: (s) => this.primaryContainer(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onPrimaryContainer(), '2025', color2025);
    }
    primaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'primary_fixed',
            palette: (s) => s.primaryPalette,
            tone: (s) => {
                let tempS = Object.assign({}, s, { isDark: false, contrastLevel: 0 });
                return this.primaryContainer().getTone(tempS);
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.primaryFixed(), '2025', color2025);
    }
    primaryFixedDim() {
        const color2025 = DynamicColor.fromPalette({
            name: 'primary_fixed_dim',
            palette: (s) => s.primaryPalette,
            tone: (s) => this.primaryFixed().getTone(s),
            isBackground: true,
            toneDeltaPair: (s) => new ToneDeltaPair(this.primaryFixedDim(), this.primaryFixed(), 5, 'darker', true, 'exact'),
        });
        return extendSpecVersion(super.primaryFixedDim(), '2025', color2025);
    }
    onPrimaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_primary_fixed',
            palette: (s) => s.primaryPalette,
            background: (s) => this.primaryFixedDim(),
            contrastCurve: (s) => getCurve(7),
        });
        return extendSpecVersion(super.onPrimaryFixed(), '2025', color2025);
    }
    onPrimaryFixedVariant() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_primary_fixed_variant',
            palette: (s) => s.primaryPalette,
            background: (s) => this.primaryFixedDim(),
            contrastCurve: (s) => getCurve(4.5),
        });
        return extendSpecVersion(super.onPrimaryFixedVariant(), '2025', color2025);
    }
    inversePrimary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'inverse_primary',
            palette: (s) => s.primaryPalette,
            tone: (s) => tMaxC(s.primaryPalette),
            background: (s) => this.inverseSurface(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.inversePrimary(), '2025', color2025);
    }
    ////////////////////////////////////////////////////////////////
    // Secondaries [Q]                                            //
    ////////////////////////////////////////////////////////////////
    secondary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'secondary',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return s.variant === Variant.NEUTRAL ?
                        90 :
                        tMaxC(s.secondaryPalette, 0, 90);
                }
                else if (s.variant === Variant.NEUTRAL) {
                    return s.isDark ? tMinC(s.secondaryPalette, 0, 98) :
                        tMaxC(s.secondaryPalette);
                }
                else if (s.variant === Variant.VIBRANT) {
                    return tMaxC(s.secondaryPalette, 0, s.isDark ? 90 : 98);
                }
                else { // EXPRESSIVE and TONAL_SPOT
                    return s.isDark ? 80 : tMaxC(s.secondaryPalette);
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(4.5) : getCurve(7),
            toneDeltaPair: (s) => s.platform === 'phone' ?
                new ToneDeltaPair(this.secondaryContainer(), this.secondary(), 5, 'relative_lighter', true, 'farther') :
                undefined,
        });
        return extendSpecVersion(super.secondary(), '2025', color2025);
    }
    secondaryDim() {
        return DynamicColor.fromPalette({
            name: 'secondary_dim',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                if (s.variant === Variant.NEUTRAL) {
                    return 85;
                }
                else {
                    return tMaxC(s.secondaryPalette, 0, 90);
                }
            },
            isBackground: true,
            background: (s) => this.surfaceContainerHigh(),
            contrastCurve: (s) => getCurve(4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryDim(), this.secondary(), 5, 'darker', true, 'farther'),
        });
    }
    onSecondary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_secondary',
            palette: (s) => s.secondaryPalette,
            background: (s) => s.platform === 'phone' ? this.secondary() : this.secondaryDim(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onSecondary(), '2025', color2025);
    }
    secondaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'secondary_container',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return 30;
                }
                else if (s.variant === Variant.VIBRANT) {
                    return s.isDark ? tMinC(s.secondaryPalette, 30, 40) :
                        tMaxC(s.secondaryPalette, 84, 90);
                }
                else if (s.variant === Variant.EXPRESSIVE) {
                    return s.isDark ? 15 : tMaxC(s.secondaryPalette, 90, 95);
                }
                else {
                    return s.isDark ? 25 : 90;
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            toneDeltaPair: (s) => s.platform === 'watch' ?
                new ToneDeltaPair(this.secondaryContainer(), this.secondaryDim(), 10, 'darker', true, 'farther') :
                undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.secondaryContainer(), '2025', color2025);
    }
    onSecondaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_secondary_container',
            palette: (s) => s.secondaryPalette,
            background: (s) => this.secondaryContainer(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onSecondaryContainer(), '2025', color2025);
    }
    secondaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'secondary_fixed',
            palette: (s) => s.secondaryPalette,
            tone: (s) => {
                let tempS = Object.assign({}, s, { isDark: false, contrastLevel: 0 });
                return this.secondaryContainer().getTone(tempS);
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.secondaryFixed(), '2025', color2025);
    }
    secondaryFixedDim() {
        const color2025 = DynamicColor.fromPalette({
            name: 'secondary_fixed_dim',
            palette: (s) => s.secondaryPalette,
            tone: (s) => this.secondaryFixed().getTone(s),
            isBackground: true,
            toneDeltaPair: (s) => new ToneDeltaPair(this.secondaryFixedDim(), this.secondaryFixed(), 5, 'darker', true, 'exact'),
        });
        return extendSpecVersion(super.secondaryFixedDim(), '2025', color2025);
    }
    onSecondaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_secondary_fixed',
            palette: (s) => s.secondaryPalette,
            background: (s) => this.secondaryFixedDim(),
            contrastCurve: (s) => getCurve(7),
        });
        return extendSpecVersion(super.onSecondaryFixed(), '2025', color2025);
    }
    onSecondaryFixedVariant() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_secondary_fixed_variant',
            palette: (s) => s.secondaryPalette,
            background: (s) => this.secondaryFixedDim(),
            contrastCurve: (s) => getCurve(4.5),
        });
        return extendSpecVersion(super.onSecondaryFixedVariant(), '2025', color2025);
    }
    ////////////////////////////////////////////////////////////////
    // Tertiaries [T]                                             //
    ////////////////////////////////////////////////////////////////
    tertiary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'tertiary',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return s.variant === Variant.TONAL_SPOT ?
                        tMaxC(s.tertiaryPalette, 0, 90) :
                        tMaxC(s.tertiaryPalette);
                }
                else if (s.variant === Variant.EXPRESSIVE || s.variant === Variant.VIBRANT) {
                    return tMaxC(s.tertiaryPalette, 0, Hct.isCyan(s.tertiaryPalette.hue) ? 88 : (s.isDark ? 98 : 100));
                }
                else { // NEUTRAL and TONAL_SPOT
                    return s.isDark ? tMaxC(s.tertiaryPalette, 0, 98) :
                        tMaxC(s.tertiaryPalette);
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(4.5) : getCurve(7),
            toneDeltaPair: (s) => s.platform === 'phone' ?
                new ToneDeltaPair(this.tertiaryContainer(), this.tertiary(), 5, 'relative_lighter', true, 'farther') :
                undefined,
        });
        return extendSpecVersion(super.tertiary(), '2025', color2025);
    }
    tertiaryDim() {
        return DynamicColor.fromPalette({
            name: 'tertiary_dim',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (s.variant === Variant.TONAL_SPOT) {
                    return tMaxC(s.tertiaryPalette, 0, 90);
                }
                else {
                    return tMaxC(s.tertiaryPalette);
                }
            },
            isBackground: true,
            background: (s) => this.surfaceContainerHigh(),
            contrastCurve: (s) => getCurve(4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryDim(), this.tertiary(), 5, 'darker', true, 'farther'),
        });
    }
    onTertiary() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_tertiary',
            palette: (s) => s.tertiaryPalette,
            background: (s) => s.platform === 'phone' ? this.tertiary() : this.tertiaryDim(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onTertiary(), '2025', color2025);
    }
    tertiaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'tertiary_container',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return s.variant === Variant.TONAL_SPOT ?
                        tMaxC(s.tertiaryPalette, 0, 90) :
                        tMaxC(s.tertiaryPalette);
                }
                else {
                    if (s.variant === Variant.NEUTRAL) {
                        return s.isDark ? tMaxC(s.tertiaryPalette, 0, 93) :
                            tMaxC(s.tertiaryPalette, 0, 96);
                    }
                    else if (s.variant === Variant.TONAL_SPOT) {
                        return tMaxC(s.tertiaryPalette, 0, s.isDark ? 93 : 100);
                    }
                    else if (s.variant === Variant.EXPRESSIVE) {
                        return tMaxC(s.tertiaryPalette, 75, Hct.isCyan(s.tertiaryPalette.hue) ? 88 : (s.isDark ? 93 : 100));
                    }
                    else { // VIBRANT
                        return s.isDark ? tMaxC(s.tertiaryPalette, 0, 93) :
                            tMaxC(s.tertiaryPalette, 72, 100);
                    }
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            toneDeltaPair: (s) => s.platform === 'watch' ?
                new ToneDeltaPair(this.tertiaryContainer(), this.tertiaryDim(), 10, 'darker', true, 'farther') :
                undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.tertiaryContainer(), '2025', color2025);
    }
    onTertiaryContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_tertiary_container',
            palette: (s) => s.tertiaryPalette,
            background: (s) => this.tertiaryContainer(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onTertiaryContainer(), '2025', color2025);
    }
    tertiaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'tertiary_fixed',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => {
                let tempS = Object.assign({}, s, { isDark: false, contrastLevel: 0 });
                return this.tertiaryContainer().getTone(tempS);
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.tertiaryFixed(), '2025', color2025);
    }
    tertiaryFixedDim() {
        const color2025 = DynamicColor.fromPalette({
            name: 'tertiary_fixed_dim',
            palette: (s) => s.tertiaryPalette,
            tone: (s) => this.tertiaryFixed().getTone(s),
            isBackground: true,
            toneDeltaPair: (s) => new ToneDeltaPair(this.tertiaryFixedDim(), this.tertiaryFixed(), 5, 'darker', true, 'exact'),
        });
        return extendSpecVersion(super.tertiaryFixedDim(), '2025', color2025);
    }
    onTertiaryFixed() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_tertiary_fixed',
            palette: (s) => s.tertiaryPalette,
            background: (s) => this.tertiaryFixedDim(),
            contrastCurve: (s) => getCurve(7),
        });
        return extendSpecVersion(super.onTertiaryFixed(), '2025', color2025);
    }
    onTertiaryFixedVariant() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_tertiary_fixed_variant',
            palette: (s) => s.tertiaryPalette,
            background: (s) => this.tertiaryFixedDim(),
            contrastCurve: (s) => getCurve(4.5),
        });
        return extendSpecVersion(super.onTertiaryFixedVariant(), '2025', color2025);
    }
    ////////////////////////////////////////////////////////////////
    // Errors [E]                                                 //
    ////////////////////////////////////////////////////////////////
    error() {
        const color2025 = DynamicColor.fromPalette({
            name: 'error',
            palette: (s) => s.errorPalette,
            tone: (s) => {
                if (s.platform === 'phone') {
                    return s.isDark ? tMinC(s.errorPalette, 0, 98) :
                        tMaxC(s.errorPalette);
                }
                else {
                    return tMinC(s.errorPalette);
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) :
                this.surfaceContainerHigh(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(4.5) : getCurve(7),
            toneDeltaPair: (s) => s.platform === 'phone' ?
                new ToneDeltaPair(this.errorContainer(), this.error(), 5, 'relative_lighter', true, 'farther') :
                undefined,
        });
        return extendSpecVersion(super.error(), '2025', color2025);
    }
    errorDim() {
        return DynamicColor.fromPalette({
            name: 'error_dim',
            palette: (s) => s.errorPalette,
            tone: (s) => tMinC(s.errorPalette),
            isBackground: true,
            background: (s) => this.surfaceContainerHigh(),
            contrastCurve: (s) => getCurve(4.5),
            toneDeltaPair: (s) => new ToneDeltaPair(this.errorDim(), this.error(), 5, 'darker', true, 'farther'),
        });
    }
    onError() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_error',
            palette: (s) => s.errorPalette,
            background: (s) => s.platform === 'phone' ? this.error() : this.errorDim(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(6) : getCurve(7),
        });
        return extendSpecVersion(super.onError(), '2025', color2025);
    }
    errorContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'error_container',
            palette: (s) => s.errorPalette,
            tone: (s) => {
                if (s.platform === 'watch') {
                    return 30;
                }
                else {
                    return s.isDark ? tMinC(s.errorPalette, 30, 93) :
                        tMaxC(s.errorPalette, 0, 90);
                }
            },
            isBackground: true,
            background: (s) => s.platform === 'phone' ? this.highestSurface(s) : undefined,
            toneDeltaPair: (s) => s.platform === 'watch' ?
                new ToneDeltaPair(this.errorContainer(), this.errorDim(), 10, 'darker', true, 'farther') :
                undefined,
            contrastCurve: (s) => s.platform === 'phone' && s.contrastLevel > 0 ?
                getCurve(1.5) :
                undefined,
        });
        return extendSpecVersion(super.errorContainer(), '2025', color2025);
    }
    onErrorContainer() {
        const color2025 = DynamicColor.fromPalette({
            name: 'on_error_container',
            palette: (s) => s.errorPalette,
            background: (s) => this.errorContainer(),
            contrastCurve: (s) => s.platform === 'phone' ? getCurve(4.5) : getCurve(7),
        });
        return extendSpecVersion(super.onErrorContainer(), '2025', color2025);
    }
    /////////////////////////////////////////////////////////////////
    // Remapped Colors                                             //
    /////////////////////////////////////////////////////////////////
    surfaceVariant() {
        const color2025 = Object.assign(this.surfaceContainerHighest().clone(), { name: 'surface_variant' });
        return extendSpecVersion(super.surfaceVariant(), '2025', color2025);
    }
    surfaceTint() {
        const color2025 = Object.assign(this.primary().clone(), { name: 'surface_tint' });
        return extendSpecVersion(super.surfaceTint(), '2025', color2025);
    }
    background() {
        const color2025 = Object.assign(this.surface().clone(), { name: 'background' });
        return extendSpecVersion(super.background(), '2025', color2025);
    }
    onBackground() {
        const color2025 = Object.assign(this.onSurface().clone(), {
            name: 'on_background',
            tone: (s) => {
                return s.platform === 'watch' ? 100.0 : this.onSurface().getTone(s);
            }
        });
        return extendSpecVersion(super.onBackground(), '2025', color2025);
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * DynamicColors for the colors in the Material Design system.
 */
// Material Color Utilities namespaces the various utilities it provides.
// tslint:disable-next-line:class-as-namespace
class MaterialDynamicColors {
    constructor() {
        ////////////////////////////////////////////////////////////////
        // All Colors                                                 //
        ////////////////////////////////////////////////////////////////
        this.allColors = [
            this.background(),
            this.onBackground(),
            this.surface(),
            this.surfaceDim(),
            this.surfaceBright(),
            this.surfaceContainerLowest(),
            this.surfaceContainerLow(),
            this.surfaceContainer(),
            this.surfaceContainerHigh(),
            this.surfaceContainerHighest(),
            this.onSurface(),
            this.onSurfaceVariant(),
            this.outline(),
            this.outlineVariant(),
            this.inverseSurface(),
            this.inverseOnSurface(),
            this.primary(),
            this.primaryDim(),
            this.onPrimary(),
            this.primaryContainer(),
            this.onPrimaryContainer(),
            this.primaryFixed(),
            this.primaryFixedDim(),
            this.onPrimaryFixed(),
            this.onPrimaryFixedVariant(),
            this.inversePrimary(),
            this.secondary(),
            this.secondaryDim(),
            this.onSecondary(),
            this.secondaryContainer(),
            this.onSecondaryContainer(),
            this.secondaryFixed(),
            this.secondaryFixedDim(),
            this.onSecondaryFixed(),
            this.onSecondaryFixedVariant(),
            this.tertiary(),
            this.tertiaryDim(),
            this.onTertiary(),
            this.tertiaryContainer(),
            this.onTertiaryContainer(),
            this.tertiaryFixed(),
            this.tertiaryFixedDim(),
            this.onTertiaryFixed(),
            this.onTertiaryFixedVariant(),
            this.error(),
            this.errorDim(),
            this.onError(),
            this.errorContainer(),
            this.onErrorContainer(),
        ].filter((c) => c !== undefined);
    }
    highestSurface(s) {
        return MaterialDynamicColors.colorSpec.highestSurface(s);
    }
    ////////////////////////////////////////////////////////////////
    // Main Palettes                                              //
    ////////////////////////////////////////////////////////////////
    primaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.primaryPaletteKeyColor();
    }
    secondaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.secondaryPaletteKeyColor();
    }
    tertiaryPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.tertiaryPaletteKeyColor();
    }
    neutralPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.neutralPaletteKeyColor();
    }
    neutralVariantPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.neutralVariantPaletteKeyColor();
    }
    errorPaletteKeyColor() {
        return MaterialDynamicColors.colorSpec.errorPaletteKeyColor();
    }
    ////////////////////////////////////////////////////////////////
    // Surfaces [S]                                               //
    ////////////////////////////////////////////////////////////////
    background() {
        return MaterialDynamicColors.colorSpec.background();
    }
    onBackground() {
        return MaterialDynamicColors.colorSpec.onBackground();
    }
    surface() {
        return MaterialDynamicColors.colorSpec.surface();
    }
    surfaceDim() {
        return MaterialDynamicColors.colorSpec.surfaceDim();
    }
    surfaceBright() {
        return MaterialDynamicColors.colorSpec.surfaceBright();
    }
    surfaceContainerLowest() {
        return MaterialDynamicColors.colorSpec.surfaceContainerLowest();
    }
    surfaceContainerLow() {
        return MaterialDynamicColors.colorSpec.surfaceContainerLow();
    }
    surfaceContainer() {
        return MaterialDynamicColors.colorSpec.surfaceContainer();
    }
    surfaceContainerHigh() {
        return MaterialDynamicColors.colorSpec.surfaceContainerHigh();
    }
    surfaceContainerHighest() {
        return MaterialDynamicColors.colorSpec.surfaceContainerHighest();
    }
    onSurface() {
        return MaterialDynamicColors.colorSpec.onSurface();
    }
    surfaceVariant() {
        return MaterialDynamicColors.colorSpec.surfaceVariant();
    }
    onSurfaceVariant() {
        return MaterialDynamicColors.colorSpec.onSurfaceVariant();
    }
    outline() {
        return MaterialDynamicColors.colorSpec.outline();
    }
    outlineVariant() {
        return MaterialDynamicColors.colorSpec.outlineVariant();
    }
    inverseSurface() {
        return MaterialDynamicColors.colorSpec.inverseSurface();
    }
    inverseOnSurface() {
        return MaterialDynamicColors.colorSpec.inverseOnSurface();
    }
    shadow() {
        return MaterialDynamicColors.colorSpec.shadow();
    }
    scrim() {
        return MaterialDynamicColors.colorSpec.scrim();
    }
    surfaceTint() {
        return MaterialDynamicColors.colorSpec.surfaceTint();
    }
    ////////////////////////////////////////////////////////////////
    // Primaries [P]                                              //
    ////////////////////////////////////////////////////////////////
    primary() {
        return MaterialDynamicColors.colorSpec.primary();
    }
    primaryDim() {
        return MaterialDynamicColors.colorSpec.primaryDim();
    }
    onPrimary() {
        return MaterialDynamicColors.colorSpec.onPrimary();
    }
    primaryContainer() {
        return MaterialDynamicColors.colorSpec.primaryContainer();
    }
    onPrimaryContainer() {
        return MaterialDynamicColors.colorSpec.onPrimaryContainer();
    }
    inversePrimary() {
        return MaterialDynamicColors.colorSpec.inversePrimary();
    }
    /////////////////////////////////////////////////////////////////
    // Primary Fixed [PF]                                          //
    /////////////////////////////////////////////////////////////////
    primaryFixed() {
        return MaterialDynamicColors.colorSpec.primaryFixed();
    }
    primaryFixedDim() {
        return MaterialDynamicColors.colorSpec.primaryFixedDim();
    }
    onPrimaryFixed() {
        return MaterialDynamicColors.colorSpec.onPrimaryFixed();
    }
    onPrimaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onPrimaryFixedVariant();
    }
    ////////////////////////////////////////////////////////////////
    // Secondaries [Q]                                            //
    ////////////////////////////////////////////////////////////////
    secondary() {
        return MaterialDynamicColors.colorSpec.secondary();
    }
    secondaryDim() {
        return MaterialDynamicColors.colorSpec.secondaryDim();
    }
    onSecondary() {
        return MaterialDynamicColors.colorSpec.onSecondary();
    }
    secondaryContainer() {
        return MaterialDynamicColors.colorSpec.secondaryContainer();
    }
    onSecondaryContainer() {
        return MaterialDynamicColors.colorSpec.onSecondaryContainer();
    }
    /////////////////////////////////////////////////////////////////
    // Secondary Fixed [QF]                                        //
    /////////////////////////////////////////////////////////////////
    secondaryFixed() {
        return MaterialDynamicColors.colorSpec.secondaryFixed();
    }
    secondaryFixedDim() {
        return MaterialDynamicColors.colorSpec.secondaryFixedDim();
    }
    onSecondaryFixed() {
        return MaterialDynamicColors.colorSpec.onSecondaryFixed();
    }
    onSecondaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onSecondaryFixedVariant();
    }
    ////////////////////////////////////////////////////////////////
    // Tertiaries [T]                                             //
    ////////////////////////////////////////////////////////////////
    tertiary() {
        return MaterialDynamicColors.colorSpec.tertiary();
    }
    tertiaryDim() {
        return MaterialDynamicColors.colorSpec.tertiaryDim();
    }
    onTertiary() {
        return MaterialDynamicColors.colorSpec.onTertiary();
    }
    tertiaryContainer() {
        return MaterialDynamicColors.colorSpec.tertiaryContainer();
    }
    onTertiaryContainer() {
        return MaterialDynamicColors.colorSpec.onTertiaryContainer();
    }
    /////////////////////////////////////////////////////////////////
    // Tertiary Fixed [TF]                                         //
    /////////////////////////////////////////////////////////////////
    tertiaryFixed() {
        return MaterialDynamicColors.colorSpec.tertiaryFixed();
    }
    tertiaryFixedDim() {
        return MaterialDynamicColors.colorSpec.tertiaryFixedDim();
    }
    onTertiaryFixed() {
        return MaterialDynamicColors.colorSpec.onTertiaryFixed();
    }
    onTertiaryFixedVariant() {
        return MaterialDynamicColors.colorSpec.onTertiaryFixedVariant();
    }
    ////////////////////////////////////////////////////////////////
    // Errors [E]                                                 //
    ////////////////////////////////////////////////////////////////
    error() {
        return MaterialDynamicColors.colorSpec.error();
    }
    errorDim() {
        return MaterialDynamicColors.colorSpec.errorDim();
    }
    onError() {
        return MaterialDynamicColors.colorSpec.onError();
    }
    errorContainer() {
        return MaterialDynamicColors.colorSpec.errorContainer();
    }
    onErrorContainer() {
        return MaterialDynamicColors.colorSpec.onErrorContainer();
    }
    // Static variables are deprecated. Use the instance methods to get correct
    // specs based on request.
    /** @deprecated Use highestSurface() instead. */
    static highestSurface(s) {
        return MaterialDynamicColors.colorSpec.highestSurface(s);
    }
}
MaterialDynamicColors.contentAccentToneDelta = 15.0;
MaterialDynamicColors.colorSpec = new ColorSpecDelegateImpl2025();
/** @deprecated Use primaryPaletteKeyColor() instead. */
MaterialDynamicColors.primaryPaletteKeyColor = MaterialDynamicColors.colorSpec.primaryPaletteKeyColor();
/** @deprecated Use secondaryPaletteKeyColor() instead. */
MaterialDynamicColors.secondaryPaletteKeyColor = MaterialDynamicColors.colorSpec.secondaryPaletteKeyColor();
/** @deprecated Use tertiaryPaletteKeyColor() instead. */
MaterialDynamicColors.tertiaryPaletteKeyColor = MaterialDynamicColors.colorSpec.tertiaryPaletteKeyColor();
/** @deprecated Use neutralPaletteKeyColor() instead. */
MaterialDynamicColors.neutralPaletteKeyColor = MaterialDynamicColors.colorSpec.neutralPaletteKeyColor();
/** @deprecated Use neutralVariantPaletteKeyColor() instead. */
MaterialDynamicColors.neutralVariantPaletteKeyColor = MaterialDynamicColors.colorSpec.neutralVariantPaletteKeyColor();
/** @deprecated Use background() instead. */
MaterialDynamicColors.background = MaterialDynamicColors.colorSpec.background();
/** @deprecated Use background() instead. */
MaterialDynamicColors.onBackground = MaterialDynamicColors.colorSpec.onBackground();
/** @deprecated Use surface() instead. */
MaterialDynamicColors.surface = MaterialDynamicColors.colorSpec.surface();
/** @deprecated Use surfaceDim() instead. */
MaterialDynamicColors.surfaceDim = MaterialDynamicColors.colorSpec.surfaceDim();
/** @deprecated Use surfaceBright() instead. */
MaterialDynamicColors.surfaceBright = MaterialDynamicColors.colorSpec.surfaceBright();
/** @deprecated Use surfaceContainerLowest() instead. */
MaterialDynamicColors.surfaceContainerLowest = MaterialDynamicColors.colorSpec.surfaceContainerLowest();
/** @deprecated Use surfaceContainerLow() instead. */
MaterialDynamicColors.surfaceContainerLow = MaterialDynamicColors.colorSpec.surfaceContainerLow();
/** @deprecated Use surfaceContainer() instead. */
MaterialDynamicColors.surfaceContainer = MaterialDynamicColors.colorSpec.surfaceContainer();
/** @deprecated Use surfaceContainerHigh() instead. */
MaterialDynamicColors.surfaceContainerHigh = MaterialDynamicColors.colorSpec.surfaceContainerHigh();
/** @deprecated Use surfaceContainerHighest() instead. */
MaterialDynamicColors.surfaceContainerHighest = MaterialDynamicColors.colorSpec.surfaceContainerHighest();
/** @deprecated Use onSurface() instead. */
MaterialDynamicColors.onSurface = MaterialDynamicColors.colorSpec.onSurface();
/** @deprecated Use surfaceVariant() instead. */
MaterialDynamicColors.surfaceVariant = MaterialDynamicColors.colorSpec.surfaceVariant();
/** @deprecated Use onSurfaceVariant() instead. */
MaterialDynamicColors.onSurfaceVariant = MaterialDynamicColors.colorSpec.onSurfaceVariant();
/** @deprecated Use inverseSurface() instead. */
MaterialDynamicColors.inverseSurface = MaterialDynamicColors.colorSpec.inverseSurface();
/** @deprecated Use inverseOnSurface() instead. */
MaterialDynamicColors.inverseOnSurface = MaterialDynamicColors.colorSpec.inverseOnSurface();
/** @deprecated Use outline() instead. */
MaterialDynamicColors.outline = MaterialDynamicColors.colorSpec.outline();
/** @deprecated Use outlineVariant() instead. */
MaterialDynamicColors.outlineVariant = MaterialDynamicColors.colorSpec.outlineVariant();
/** @deprecated Use shadow() instead. */
MaterialDynamicColors.shadow = MaterialDynamicColors.colorSpec.shadow();
/** @deprecated Use scrim() instead. */
MaterialDynamicColors.scrim = MaterialDynamicColors.colorSpec.scrim();
/** @deprecated Use surfaceTint() instead. */
MaterialDynamicColors.surfaceTint = MaterialDynamicColors.colorSpec.surfaceTint();
/** @deprecated Use primary() instead. */
MaterialDynamicColors.primary = MaterialDynamicColors.colorSpec.primary();
/** @deprecated Use onPrimary() instead. */
MaterialDynamicColors.onPrimary = MaterialDynamicColors.colorSpec.onPrimary();
/** @deprecated Use primaryContainer() instead. */
MaterialDynamicColors.primaryContainer = MaterialDynamicColors.colorSpec.primaryContainer();
/** @deprecated Use onPrimaryContainer() instead. */
MaterialDynamicColors.onPrimaryContainer = MaterialDynamicColors.colorSpec.onPrimaryContainer();
/** @deprecated Use inversePrimary() instead. */
MaterialDynamicColors.inversePrimary = MaterialDynamicColors.colorSpec.inversePrimary();
/** @deprecated Use secondary() instead. */
MaterialDynamicColors.secondary = MaterialDynamicColors.colorSpec.secondary();
/** @deprecated Use onSecondary() instead. */
MaterialDynamicColors.onSecondary = MaterialDynamicColors.colorSpec.onSecondary();
/** @deprecated Use secondaryContainer() instead. */
MaterialDynamicColors.secondaryContainer = MaterialDynamicColors.colorSpec.secondaryContainer();
/** @deprecated Use onSecondaryContainer() instead. */
MaterialDynamicColors.onSecondaryContainer = MaterialDynamicColors.colorSpec.onSecondaryContainer();
/** @deprecated Use tertiary() instead. */
MaterialDynamicColors.tertiary = MaterialDynamicColors.colorSpec.tertiary();
/** @deprecated Use onTertiary() instead. */
MaterialDynamicColors.onTertiary = MaterialDynamicColors.colorSpec.onTertiary();
/** @deprecated Use tertiaryContainer() instead. */
MaterialDynamicColors.tertiaryContainer = MaterialDynamicColors.colorSpec.tertiaryContainer();
/** @deprecated Use onTertiaryContainer() instead. */
MaterialDynamicColors.onTertiaryContainer = MaterialDynamicColors.colorSpec.onTertiaryContainer();
/** @deprecated Use error() instead. */
MaterialDynamicColors.error = MaterialDynamicColors.colorSpec.error();
/** @deprecated Use onError() instead. */
MaterialDynamicColors.onError = MaterialDynamicColors.colorSpec.onError();
/** @deprecated Use errorContainer() instead. */
MaterialDynamicColors.errorContainer = MaterialDynamicColors.colorSpec.errorContainer();
/** @deprecated Use onErrorContainer() instead. */
MaterialDynamicColors.onErrorContainer = MaterialDynamicColors.colorSpec.onErrorContainer();
/** @deprecated Use primaryFixed() instead. */
MaterialDynamicColors.primaryFixed = MaterialDynamicColors.colorSpec.primaryFixed();
/** @deprecated Use primaryFixedDim() instead. */
MaterialDynamicColors.primaryFixedDim = MaterialDynamicColors.colorSpec.primaryFixedDim();
/** @deprecated Use onPrimaryFixed() instead. */
MaterialDynamicColors.onPrimaryFixed = MaterialDynamicColors.colorSpec.onPrimaryFixed();
/** @deprecated Use onPrimaryFixedVariant() instead. */
MaterialDynamicColors.onPrimaryFixedVariant = MaterialDynamicColors.colorSpec.onPrimaryFixedVariant();
/** @deprecated Use secondaryFixed() instead. */
MaterialDynamicColors.secondaryFixed = MaterialDynamicColors.colorSpec.secondaryFixed();
/** @deprecated Use secondaryFixedDim() instead. */
MaterialDynamicColors.secondaryFixedDim = MaterialDynamicColors.colorSpec.secondaryFixedDim();
/** @deprecated Use onSecondaryFixed() instead. */
MaterialDynamicColors.onSecondaryFixed = MaterialDynamicColors.colorSpec.onSecondaryFixed();
/** @deprecated Use onSecondaryFixedVariant() instead. */
MaterialDynamicColors.onSecondaryFixedVariant = MaterialDynamicColors.colorSpec.onSecondaryFixedVariant();
/** @deprecated Use tertiaryFixed() instead. */
MaterialDynamicColors.tertiaryFixed = MaterialDynamicColors.colorSpec.tertiaryFixed();
/** @deprecated Use tertiaryFixedDim() instead. */
MaterialDynamicColors.tertiaryFixedDim = MaterialDynamicColors.colorSpec.tertiaryFixedDim();
/** @deprecated Use onTertiaryFixed() instead. */
MaterialDynamicColors.onTertiaryFixed = MaterialDynamicColors.colorSpec.onTertiaryFixed();
/** @deprecated Use onTertiaryFixedVariant() instead. */
MaterialDynamicColors.onTertiaryFixedVariant = MaterialDynamicColors.colorSpec.onTertiaryFixedVariant();

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Constructed by a set of values representing the current UI state (such as
 * whether or not its dark theme, what the theme style is, etc.), and
 * provides a set of TonalPalettes that can create colors that fit in
 * with the theme style. Used by DynamicColor to resolve into a color.
 */
class DynamicScheme {
    static maybeFallbackSpecVersion(specVersion, variant) {
        switch (variant) {
            case Variant.EXPRESSIVE:
            case Variant.VIBRANT:
            case Variant.TONAL_SPOT:
            case Variant.NEUTRAL:
                return specVersion;
            default:
                return '2021';
        }
    }
    constructor(args) {
        this.sourceColorArgb = args.sourceColorHct.toInt();
        this.variant = args.variant;
        this.contrastLevel = args.contrastLevel;
        this.isDark = args.isDark;
        this.platform = args.platform ?? 'phone';
        this.specVersion = DynamicScheme.maybeFallbackSpecVersion(args.specVersion ?? '2021', this.variant);
        this.sourceColorHct = args.sourceColorHct;
        this.primaryPalette = args.primaryPalette ??
            getSpec(this.specVersion)
                .getPrimaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.secondaryPalette = args.secondaryPalette ??
            getSpec(this.specVersion)
                .getSecondaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.tertiaryPalette = args.tertiaryPalette ??
            getSpec(this.specVersion)
                .getTertiaryPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.neutralPalette = args.neutralPalette ??
            getSpec(this.specVersion)
                .getNeutralPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.neutralVariantPalette = args.neutralVariantPalette ??
            getSpec(this.specVersion)
                .getNeutralVariantPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel);
        this.errorPalette = args.errorPalette ??
            getSpec(this.specVersion)
                .getErrorPalette(this.variant, args.sourceColorHct, this.isDark, this.platform, this.contrastLevel) ??
            TonalPalette.fromHueAndChroma(25.0, 84.0);
        this.colors = new MaterialDynamicColors();
    }
    toString() {
        return `Scheme: ` +
            `variant=${Variant[this.variant]}, ` +
            `mode=${this.isDark ? 'dark' : 'light'}, ` +
            `platform=${this.platform}, ` +
            `contrastLevel=${this.contrastLevel.toFixed(1)}, ` +
            `seed=${this.sourceColorHct.toString()}, ` +
            `specVersion=${this.specVersion}`;
    }
    /**
     * Returns a new hue based on a piecewise function and input color hue.
     *
     * For example, for the following function:
     * result = 26 if 0 <= hue < 101
     * result = 39 if 101 <= hue < 210
     * result = 28 if 210 <= hue < 360
     *
     * call the function as:
     *
     * const hueBreakpoints = [0, 101, 210, 360];
     * const hues = [26, 39, 28];
     * const result = scheme.piecewise(hue, hueBreakpoints, hues);
     *
     * @param sourceColorHct The input value.
     * @param hueBreakpoints The breakpoints, in sorted order. No default lower or
     *     upper bounds are assumed.
     * @param hues The hues that should be applied when source color's hue is >=
     *     the same index in hueBrakpoints array, and < the hue at the next index
     *     in hueBrakpoints array. Otherwise, the source color's hue is returned.
     */
    static getPiecewiseHue(sourceColorHct, hueBreakpoints, hues) {
        const size = Math.min(hueBreakpoints.length - 1, hues.length);
        const sourceHue = sourceColorHct.hue;
        for (let i = 0; i < size; i++) {
            if (sourceHue >= hueBreakpoints[i] && sourceHue < hueBreakpoints[i + 1]) {
                return sanitizeDegreesDouble(hues[i]);
            }
        }
        // No condition matched, return the source hue.
        return sourceHue;
    }
    /**
     * Returns a shifted hue based on a piecewise function and input color hue.
     *
     * For example, for the following function:
     * result = hue + 26 if 0 <= hue < 101
     * result = hue - 39 if 101 <= hue < 210
     * result = hue + 28 if 210 <= hue < 360
     *
     * call the function as:
     *
     * const hueBreakpoints = [0, 101, 210, 360];
     * const hues = [26, -39, 28];
     * const result = scheme.getRotatedHue(hue, hueBreakpoints, hues);
     *
     * @param sourceColorHct the source color of the theme, in HCT.
     * @param hueBreakpoints The "breakpoints", i.e. the hues at which a rotation
     *     should be apply. No default lower or upper bounds are assumed.
     * @param rotations The rotation that should be applied when source color's
     *     hue is >= the same index in hues array, and < the hue at the next
     *     index in hues array. Otherwise, the source color's hue is returned.
     */
    static getRotatedHue(sourceColorHct, hueBreakpoints, rotations) {
        let rotation = DynamicScheme.getPiecewiseHue(sourceColorHct, hueBreakpoints, rotations);
        if (Math.min(hueBreakpoints.length - 1, rotations.length) <= 0) {
            // No condition matched, return the source hue.
            rotation = 0;
        }
        return sanitizeDegreesDouble(sourceColorHct.hue + rotation);
    }
    getArgb(dynamicColor) {
        return dynamicColor.getArgb(this);
    }
    getHct(dynamicColor) {
        return dynamicColor.getHct(this);
    }
    // Palette key colors
    get primaryPaletteKeyColor() {
        return this.getArgb(this.colors.primaryPaletteKeyColor());
    }
    get secondaryPaletteKeyColor() {
        return this.getArgb(this.colors.secondaryPaletteKeyColor());
    }
    get tertiaryPaletteKeyColor() {
        return this.getArgb(this.colors.tertiaryPaletteKeyColor());
    }
    get neutralPaletteKeyColor() {
        return this.getArgb(this.colors.neutralPaletteKeyColor());
    }
    get neutralVariantPaletteKeyColor() {
        return this.getArgb(this.colors.neutralVariantPaletteKeyColor());
    }
    get errorPaletteKeyColor() {
        return this.getArgb(this.colors.errorPaletteKeyColor());
    }
    // Surface colors
    get background() {
        return this.getArgb(this.colors.background());
    }
    get onBackground() {
        return this.getArgb(this.colors.onBackground());
    }
    get surface() {
        return this.getArgb(this.colors.surface());
    }
    get surfaceDim() {
        return this.getArgb(this.colors.surfaceDim());
    }
    get surfaceBright() {
        return this.getArgb(this.colors.surfaceBright());
    }
    get surfaceContainerLowest() {
        return this.getArgb(this.colors.surfaceContainerLowest());
    }
    get surfaceContainerLow() {
        return this.getArgb(this.colors.surfaceContainerLow());
    }
    get surfaceContainer() {
        return this.getArgb(this.colors.surfaceContainer());
    }
    get surfaceContainerHigh() {
        return this.getArgb(this.colors.surfaceContainerHigh());
    }
    get surfaceContainerHighest() {
        return this.getArgb(this.colors.surfaceContainerHighest());
    }
    get onSurface() {
        return this.getArgb(this.colors.onSurface());
    }
    get surfaceVariant() {
        return this.getArgb(this.colors.surfaceVariant());
    }
    get onSurfaceVariant() {
        return this.getArgb(this.colors.onSurfaceVariant());
    }
    get inverseSurface() {
        return this.getArgb(this.colors.inverseSurface());
    }
    get inverseOnSurface() {
        return this.getArgb(this.colors.inverseOnSurface());
    }
    get outline() {
        return this.getArgb(this.colors.outline());
    }
    get outlineVariant() {
        return this.getArgb(this.colors.outlineVariant());
    }
    get shadow() {
        return this.getArgb(this.colors.shadow());
    }
    get scrim() {
        return this.getArgb(this.colors.scrim());
    }
    get surfaceTint() {
        return this.getArgb(this.colors.surfaceTint());
    }
    // Primary colors
    get primary() {
        return this.getArgb(this.colors.primary());
    }
    get primaryDim() {
        const primaryDim = this.colors.primaryDim();
        if (primaryDim === undefined) {
            throw new Error('`primaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(primaryDim);
    }
    get onPrimary() {
        return this.getArgb(this.colors.onPrimary());
    }
    get primaryContainer() {
        return this.getArgb(this.colors.primaryContainer());
    }
    get onPrimaryContainer() {
        return this.getArgb(this.colors.onPrimaryContainer());
    }
    get primaryFixed() {
        return this.getArgb(this.colors.primaryFixed());
    }
    get primaryFixedDim() {
        return this.getArgb(this.colors.primaryFixedDim());
    }
    get onPrimaryFixed() {
        return this.getArgb(this.colors.onPrimaryFixed());
    }
    get onPrimaryFixedVariant() {
        return this.getArgb(this.colors.onPrimaryFixedVariant());
    }
    get inversePrimary() {
        return this.getArgb(this.colors.inversePrimary());
    }
    // Secondary colors
    get secondary() {
        return this.getArgb(this.colors.secondary());
    }
    get secondaryDim() {
        const secondaryDim = this.colors.secondaryDim();
        if (secondaryDim === undefined) {
            throw new Error('`secondaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(secondaryDim);
    }
    get onSecondary() {
        return this.getArgb(this.colors.onSecondary());
    }
    get secondaryContainer() {
        return this.getArgb(this.colors.secondaryContainer());
    }
    get onSecondaryContainer() {
        return this.getArgb(this.colors.onSecondaryContainer());
    }
    get secondaryFixed() {
        return this.getArgb(this.colors.secondaryFixed());
    }
    get secondaryFixedDim() {
        return this.getArgb(this.colors.secondaryFixedDim());
    }
    get onSecondaryFixed() {
        return this.getArgb(this.colors.onSecondaryFixed());
    }
    get onSecondaryFixedVariant() {
        return this.getArgb(this.colors.onSecondaryFixedVariant());
    }
    // Tertiary colors
    get tertiary() {
        return this.getArgb(this.colors.tertiary());
    }
    get tertiaryDim() {
        const tertiaryDim = this.colors.tertiaryDim();
        if (tertiaryDim === undefined) {
            throw new Error('`tertiaryDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(tertiaryDim);
    }
    get onTertiary() {
        return this.getArgb(this.colors.onTertiary());
    }
    get tertiaryContainer() {
        return this.getArgb(this.colors.tertiaryContainer());
    }
    get onTertiaryContainer() {
        return this.getArgb(this.colors.onTertiaryContainer());
    }
    get tertiaryFixed() {
        return this.getArgb(this.colors.tertiaryFixed());
    }
    get tertiaryFixedDim() {
        return this.getArgb(this.colors.tertiaryFixedDim());
    }
    get onTertiaryFixed() {
        return this.getArgb(this.colors.onTertiaryFixed());
    }
    get onTertiaryFixedVariant() {
        return this.getArgb(this.colors.onTertiaryFixedVariant());
    }
    // Error colors
    get error() {
        return this.getArgb(this.colors.error());
    }
    get errorDim() {
        const errorDim = this.colors.errorDim();
        if (errorDim === undefined) {
            throw new Error('`errorDim` color is undefined prior to 2025 spec.');
        }
        return this.getArgb(errorDim);
    }
    get onError() {
        return this.getArgb(this.colors.onError());
    }
    get errorContainer() {
        return this.getArgb(this.colors.errorContainer());
    }
    get onErrorContainer() {
        return this.getArgb(this.colors.onErrorContainer());
    }
}
DynamicScheme.DEFAULT_SPEC_VERSION = '2021';
DynamicScheme.DEFAULT_PLATFORM = 'phone';
/**
 * A delegate for the palettes of a DynamicScheme in the 2021 spec.
 */
class DynamicSchemePalettesDelegateImpl2021 {
    //////////////////////////////////////////////////////////////////
    // Scheme Palettes                                              //
    //////////////////////////////////////////////////////////////////
    getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, sourceColorHct.chroma);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue - 50.0), 48.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 48.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 36.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 240), 40);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 200.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, Math.max(sourceColorHct.chroma - 32.0, sourceColorHct.chroma * 0.5));
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue - 50.0), 36.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 8.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 21, 51, 121, 151, 191, 271, 321, 360], [45, 95, 45, 20, 45, 90, 45, 45, 45]), 24.0);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 41, 61, 101, 131, 181, 251, 301, 360], [18, 15, 10, 12, 15, 18, 15, 12, 12]), 24.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
                return TonalPalette.fromHct(DislikeAnalyzer.fixIfDisliked(new TemperatureCache(sourceColorHct)
                    .analogous(/* count= */ 3, /* divisions= */ 6)[2]));
            case Variant.FIDELITY:
                return TonalPalette.fromHct(DislikeAnalyzer.fixIfDisliked(new TemperatureCache(sourceColorHct).complement));
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 36.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.RAINBOW:
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 60.0), 24.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 21, 51, 121, 151, 191, 271, 321, 360], [120, 120, 20, 45, 20, 15, 20, 120, 120]), 32.0);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 41, 61, 101, 131, 181, 251, 301, 360], [35, 30, 20, 25, 30, 35, 30, 25, 25]), 32.0);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, sourceColorHct.chroma / 8.0);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 2.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 6.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 15), 8);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.CONTENT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (sourceColorHct.chroma / 8.0) + 4.0);
            case Variant.FIDELITY:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (sourceColorHct.chroma / 8.0) + 4.0);
            case Variant.FRUIT_SALAD:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16.0);
            case Variant.MONOCHROME:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 2.0);
            case Variant.RAINBOW:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 0.0);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 8.0);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 15), 12);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12);
            default:
                throw new Error(`Unsupported variant: ${variant}`);
        }
    }
    getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        return undefined;
    }
}
/**
 * A delegate for the palettes of a DynamicScheme in the 2025 spec.
 */
class DynamicSchemePalettesDelegateImpl2025 extends DynamicSchemePalettesDelegateImpl2021 {
    //////////////////////////////////////////////////////////////////
    // Scheme Palettes                                              //
    //////////////////////////////////////////////////////////////////
    getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (Hct.isBlue(sourceColorHct.hue) ? 12 : 8) :
                    (Hct.isBlue(sourceColorHct.hue) ? 16 : 12));
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' && isDark ? 26 : 32);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (isDark ? 36 : 48) : 40);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 74 : 56);
            default:
                return super.getPrimaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? (Hct.isBlue(sourceColorHct.hue) ? 6 : 4) :
                    (Hct.isBlue(sourceColorHct.hue) ? 10 : 6));
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, 16);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 105, 140, 204, 253, 278, 300, 333, 360], [-160, 155, -100, 96, -96, -156, -165, -160]), platform === 'phone' ? (isDark ? 16 : 24) : 24);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 140, 333, 360], [-14, 10, -14, 10, -14]), platform === 'phone' ? 56 : 36);
            default:
                return super.getSecondaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 161, 204, 278, 333, 360], [-32, 26, 10, -39, 24, -15, -32]), platform === 'phone' ? 20 : 36);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 20, 71, 161, 333, 360], [-40, 48, -32, 40, -32]), platform === 'phone' ? 28 : 32);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 105, 140, 204, 253, 278, 300, 333, 360], [-165, 160, -105, 101, -101, -160, -170, -165]), 48);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 71, 105, 140, 161, 253, 333, 360], [-72, 35, 24, -24, 62, 50, 62, -72]), 56);
            default:
                return super.getTertiaryPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    static getExpressiveNeutralHue(sourceColorHct) {
        const hue = DynamicScheme.getRotatedHue(sourceColorHct, [0, 71, 124, 253, 278, 300, 360], [10, 0, 10, 0, 10, 0]);
        return hue;
    }
    static getExpressiveNeutralChroma(sourceColorHct, isDark, platform) {
        const neutralHue = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct);
        return platform === 'phone' ?
            (isDark ? (Hct.isYellow(neutralHue) ? 6 : 14) : 18) :
            12;
    }
    static getVibrantNeutralHue(sourceColorHct) {
        return DynamicScheme.getRotatedHue(sourceColorHct, [0, 38, 105, 140, 333, 360], [-14, 10, -14, 10, -14]);
    }
    static getVibrantNeutralChroma(sourceColorHct, platform) {
        const neutralHue = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct);
        return platform === 'phone' ? 28 : (Hct.isBlue(neutralHue) ? 28 : 20);
    }
    getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 1.4 : 6);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, platform === 'phone' ? 5 : 10);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct), DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralChroma(sourceColorHct, isDark, platform));
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct), DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralChroma(sourceColorHct, platform));
            default:
                return super.getNeutralPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (platform === 'phone' ? 1.4 : 6) * 2.2);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(sourceColorHct.hue, (platform === 'phone' ? 5 : 10) * 1.7);
            case Variant.EXPRESSIVE:
                const expressiveNeutralHue = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralHue(sourceColorHct);
                const expressiveNeutralChroma = DynamicSchemePalettesDelegateImpl2025.getExpressiveNeutralChroma(sourceColorHct, isDark, platform);
                return TonalPalette.fromHueAndChroma(expressiveNeutralHue, expressiveNeutralChroma *
                    (expressiveNeutralHue >= 105 && expressiveNeutralHue < 125 ?
                        1.6 :
                        2.3));
            case Variant.VIBRANT:
                const vibrantNeutralHue = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralHue(sourceColorHct);
                const vibrantNeutralChroma = DynamicSchemePalettesDelegateImpl2025.getVibrantNeutralChroma(sourceColorHct, platform);
                return TonalPalette.fromHueAndChroma(vibrantNeutralHue, vibrantNeutralChroma * 1.29);
            default:
                return super.getNeutralVariantPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
    getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel) {
        const errorHue = DynamicScheme.getPiecewiseHue(sourceColorHct, [0, 3, 13, 23, 33, 43, 153, 273, 360], [12, 22, 32, 12, 22, 32, 22, 12]);
        switch (variant) {
            case Variant.NEUTRAL:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 50 : 40);
            case Variant.TONAL_SPOT:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 60 : 48);
            case Variant.EXPRESSIVE:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 64 : 48);
            case Variant.VIBRANT:
                return TonalPalette.fromHueAndChroma(errorHue, platform === 'phone' ? 80 : 60);
            default:
                return super.getErrorPalette(variant, sourceColorHct, isDark, platform, contrastLevel);
        }
    }
}
const spec2021 = new DynamicSchemePalettesDelegateImpl2021();
const spec2025 = new DynamicSchemePalettesDelegateImpl2025();
/**
 * Returns the DynamicSchemePalettesDelegate for the given spec version.
 */
function getSpec(specVersion) {
    return specVersion === '2025' ? spec2025 : spec2021;
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Provides conversions needed for K-Means quantization. Converting input to
 * points, and converting the final state of the K-Means algorithm to colors.
 */
class LabPointProvider {
    /**
     * Convert a color represented in ARGB to a 3-element array of L*a*b*
     * coordinates of the color.
     */
    fromInt(argb) {
        return labFromArgb(argb);
    }
    /**
     * Convert a 3-element array to a color represented in ARGB.
     */
    toInt(point) {
        return argbFromLab(point[0], point[1], point[2]);
    }
    /**
     * Standard CIE 1976 delta E formula also takes the square root, unneeded
     * here. This method is used by quantization algorithms to compare distance,
     * and the relative ordering is the same, with or without a square root.
     *
     * This relatively minor optimization is helpful because this method is
     * called at least once for each pixel in an image.
     */
    distance(from, to) {
        const dL = from[0] - to[0];
        const dA = from[1] - to[1];
        const dB = from[2] - to[2];
        return dL * dL + dA * dA + dB * dB;
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const MAX_ITERATIONS = 10;
const MIN_MOVEMENT_DISTANCE = 3.0;
/**
 * An image quantizer that improves on the speed of a standard K-Means algorithm
 * by implementing several optimizations, including deduping identical pixels
 * and a triangle inequality rule that reduces the number of comparisons needed
 * to identify which cluster a point should be moved to.
 *
 * Wsmeans stands for Weighted Square Means.
 *
 * This algorithm was designed by M. Emre Celebi, and was found in their 2011
 * paper, Improving the Performance of K-Means for Color Quantization.
 * https://arxiv.org/abs/1101.0395
 */
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable-next-line:class-as-namespace
class QuantizerWsmeans {
    /**
     * @param inputPixels Colors in ARGB format.
     * @param startingClusters Defines the initial state of the quantizer. Passing
     *     an empty array is fine, the implementation will create its own initial
     *     state that leads to reproducible results for the same inputs.
     *     Passing an array that is the result of Wu quantization leads to higher
     *     quality results.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Colors in ARGB format.
     */
    static quantize(inputPixels, startingClusters, maxColors) {
        const pixelToCount = new Map();
        const points = new Array();
        const pixels = new Array();
        const pointProvider = new LabPointProvider();
        let pointCount = 0;
        for (let i = 0; i < inputPixels.length; i++) {
            const inputPixel = inputPixels[i];
            const pixelCount = pixelToCount.get(inputPixel);
            if (pixelCount === undefined) {
                pointCount++;
                points.push(pointProvider.fromInt(inputPixel));
                pixels.push(inputPixel);
                pixelToCount.set(inputPixel, 1);
            }
            else {
                pixelToCount.set(inputPixel, pixelCount + 1);
            }
        }
        const counts = new Array();
        for (let i = 0; i < pointCount; i++) {
            const pixel = pixels[i];
            const count = pixelToCount.get(pixel);
            if (count !== undefined) {
                counts[i] = count;
            }
        }
        let clusterCount = Math.min(maxColors, pointCount);
        if (startingClusters.length > 0) {
            clusterCount = Math.min(clusterCount, startingClusters.length);
        }
        const clusters = new Array();
        for (let i = 0; i < startingClusters.length; i++) {
            clusters.push(pointProvider.fromInt(startingClusters[i]));
        }
        const additionalClustersNeeded = clusterCount - clusters.length;
        if (startingClusters.length === 0 && additionalClustersNeeded > 0) {
            for (let i = 0; i < additionalClustersNeeded; i++) {
                const l = Math.random() * 100.0;
                const a = Math.random() * (100.0 - (-100) + 1) + -100;
                const b = Math.random() * (100.0 - (-100) + 1) + -100;
                clusters.push(new Array(l, a, b));
            }
        }
        const clusterIndices = new Array();
        for (let i = 0; i < pointCount; i++) {
            clusterIndices.push(Math.floor(Math.random() * clusterCount));
        }
        const indexMatrix = new Array();
        for (let i = 0; i < clusterCount; i++) {
            indexMatrix.push(new Array());
            for (let j = 0; j < clusterCount; j++) {
                indexMatrix[i].push(0);
            }
        }
        const distanceToIndexMatrix = new Array();
        for (let i = 0; i < clusterCount; i++) {
            distanceToIndexMatrix.push(new Array());
            for (let j = 0; j < clusterCount; j++) {
                distanceToIndexMatrix[i].push(new DistanceAndIndex());
            }
        }
        const pixelCountSums = new Array();
        for (let i = 0; i < clusterCount; i++) {
            pixelCountSums.push(0);
        }
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            for (let i = 0; i < clusterCount; i++) {
                for (let j = i + 1; j < clusterCount; j++) {
                    const distance = pointProvider.distance(clusters[i], clusters[j]);
                    distanceToIndexMatrix[j][i].distance = distance;
                    distanceToIndexMatrix[j][i].index = i;
                    distanceToIndexMatrix[i][j].distance = distance;
                    distanceToIndexMatrix[i][j].index = j;
                }
                distanceToIndexMatrix[i].sort();
                for (let j = 0; j < clusterCount; j++) {
                    indexMatrix[i][j] = distanceToIndexMatrix[i][j].index;
                }
            }
            let pointsMoved = 0;
            for (let i = 0; i < pointCount; i++) {
                const point = points[i];
                const previousClusterIndex = clusterIndices[i];
                const previousCluster = clusters[previousClusterIndex];
                const previousDistance = pointProvider.distance(point, previousCluster);
                let minimumDistance = previousDistance;
                let newClusterIndex = -1;
                for (let j = 0; j < clusterCount; j++) {
                    if (distanceToIndexMatrix[previousClusterIndex][j].distance >=
                        4 * previousDistance) {
                        continue;
                    }
                    const distance = pointProvider.distance(point, clusters[j]);
                    if (distance < minimumDistance) {
                        minimumDistance = distance;
                        newClusterIndex = j;
                    }
                }
                if (newClusterIndex !== -1) {
                    const distanceChange = Math.abs((Math.sqrt(minimumDistance) - Math.sqrt(previousDistance)));
                    if (distanceChange > MIN_MOVEMENT_DISTANCE) {
                        pointsMoved++;
                        clusterIndices[i] = newClusterIndex;
                    }
                }
            }
            if (pointsMoved === 0 && iteration !== 0) {
                break;
            }
            const componentASums = new Array(clusterCount).fill(0);
            const componentBSums = new Array(clusterCount).fill(0);
            const componentCSums = new Array(clusterCount).fill(0);
            for (let i = 0; i < clusterCount; i++) {
                pixelCountSums[i] = 0;
            }
            for (let i = 0; i < pointCount; i++) {
                const clusterIndex = clusterIndices[i];
                const point = points[i];
                const count = counts[i];
                pixelCountSums[clusterIndex] += count;
                componentASums[clusterIndex] += (point[0] * count);
                componentBSums[clusterIndex] += (point[1] * count);
                componentCSums[clusterIndex] += (point[2] * count);
            }
            for (let i = 0; i < clusterCount; i++) {
                const count = pixelCountSums[i];
                if (count === 0) {
                    clusters[i] = [0.0, 0.0, 0.0];
                    continue;
                }
                const a = componentASums[i] / count;
                const b = componentBSums[i] / count;
                const c = componentCSums[i] / count;
                clusters[i] = [a, b, c];
            }
        }
        const argbToPopulation = new Map();
        for (let i = 0; i < clusterCount; i++) {
            const count = pixelCountSums[i];
            if (count === 0) {
                continue;
            }
            const possibleNewCluster = pointProvider.toInt(clusters[i]);
            if (argbToPopulation.has(possibleNewCluster)) {
                continue;
            }
            argbToPopulation.set(possibleNewCluster, count);
        }
        return argbToPopulation;
    }
}
/**
 *  A wrapper for maintaining a table of distances between K-Means clusters.
 */
class DistanceAndIndex {
    constructor() {
        this.distance = -1;
        this.index = -1;
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Quantizes an image into a map, with keys of ARGB colors, and values of the
 * number of times that color appears in the image.
 */
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable-next-line:class-as-namespace
class QuantizerMap {
    /**
     * @param pixels Colors in ARGB format.
     * @return A Map with keys of ARGB colors, and values of the number of times
     *     the color appears in the image.
     */
    static quantize(pixels) {
        const countByColor = new Map();
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const alpha = alphaFromArgb(pixel);
            if (alpha < 255) {
                continue;
            }
            countByColor.set(pixel, (countByColor.get(pixel) ?? 0) + 1);
        }
        return countByColor;
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const INDEX_BITS = 5;
const SIDE_LENGTH = 33; // ((1 << INDEX_INDEX_BITS) + 1)
const TOTAL_SIZE = 35937; // SIDE_LENGTH * SIDE_LENGTH * SIDE_LENGTH
const directions = {
    RED: 'red',
    GREEN: 'green',
    BLUE: 'blue',
};
/**
 * An image quantizer that divides the image's pixels into clusters by
 * recursively cutting an RGB cube, based on the weight of pixels in each area
 * of the cube.
 *
 * The algorithm was described by Xiaolin Wu in Graphic Gems II, published in
 * 1991.
 */
class QuantizerWu {
    constructor(weights = [], momentsR = [], momentsG = [], momentsB = [], moments = [], cubes = []) {
        this.weights = weights;
        this.momentsR = momentsR;
        this.momentsG = momentsG;
        this.momentsB = momentsB;
        this.moments = moments;
        this.cubes = cubes;
    }
    /**
     * @param pixels Colors in ARGB format.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Colors in ARGB format.
     */
    quantize(pixels, maxColors) {
        this.constructHistogram(pixels);
        this.computeMoments();
        const createBoxesResult = this.createBoxes(maxColors);
        const results = this.createResult(createBoxesResult.resultCount);
        return results;
    }
    constructHistogram(pixels) {
        this.weights = Array.from({ length: TOTAL_SIZE }).fill(0);
        this.momentsR = Array.from({ length: TOTAL_SIZE }).fill(0);
        this.momentsG = Array.from({ length: TOTAL_SIZE }).fill(0);
        this.momentsB = Array.from({ length: TOTAL_SIZE }).fill(0);
        this.moments = Array.from({ length: TOTAL_SIZE }).fill(0);
        const countByColor = QuantizerMap.quantize(pixels);
        for (const [pixel, count] of countByColor.entries()) {
            const red = redFromArgb(pixel);
            const green = greenFromArgb(pixel);
            const blue = blueFromArgb(pixel);
            const bitsToRemove = 8 - INDEX_BITS;
            const iR = (red >> bitsToRemove) + 1;
            const iG = (green >> bitsToRemove) + 1;
            const iB = (blue >> bitsToRemove) + 1;
            const index = this.getIndex(iR, iG, iB);
            this.weights[index] = (this.weights[index] ?? 0) + count;
            this.momentsR[index] += count * red;
            this.momentsG[index] += count * green;
            this.momentsB[index] += count * blue;
            this.moments[index] += count * (red * red + green * green + blue * blue);
        }
    }
    computeMoments() {
        for (let r = 1; r < SIDE_LENGTH; r++) {
            const area = Array.from({ length: SIDE_LENGTH }).fill(0);
            const areaR = Array.from({ length: SIDE_LENGTH }).fill(0);
            const areaG = Array.from({ length: SIDE_LENGTH }).fill(0);
            const areaB = Array.from({ length: SIDE_LENGTH }).fill(0);
            const area2 = Array.from({ length: SIDE_LENGTH }).fill(0.0);
            for (let g = 1; g < SIDE_LENGTH; g++) {
                let line = 0;
                let lineR = 0;
                let lineG = 0;
                let lineB = 0;
                let line2 = 0.0;
                for (let b = 1; b < SIDE_LENGTH; b++) {
                    const index = this.getIndex(r, g, b);
                    line += this.weights[index];
                    lineR += this.momentsR[index];
                    lineG += this.momentsG[index];
                    lineB += this.momentsB[index];
                    line2 += this.moments[index];
                    area[b] += line;
                    areaR[b] += lineR;
                    areaG[b] += lineG;
                    areaB[b] += lineB;
                    area2[b] += line2;
                    const previousIndex = this.getIndex(r - 1, g, b);
                    this.weights[index] = this.weights[previousIndex] + area[b];
                    this.momentsR[index] = this.momentsR[previousIndex] + areaR[b];
                    this.momentsG[index] = this.momentsG[previousIndex] + areaG[b];
                    this.momentsB[index] = this.momentsB[previousIndex] + areaB[b];
                    this.moments[index] = this.moments[previousIndex] + area2[b];
                }
            }
        }
    }
    createBoxes(maxColors) {
        this.cubes =
            Array.from({ length: maxColors }).fill(0).map(() => new Box());
        const volumeVariance = Array.from({ length: maxColors }).fill(0.0);
        this.cubes[0].r0 = 0;
        this.cubes[0].g0 = 0;
        this.cubes[0].b0 = 0;
        this.cubes[0].r1 = SIDE_LENGTH - 1;
        this.cubes[0].g1 = SIDE_LENGTH - 1;
        this.cubes[0].b1 = SIDE_LENGTH - 1;
        let generatedColorCount = maxColors;
        let next = 0;
        for (let i = 1; i < maxColors; i++) {
            if (this.cut(this.cubes[next], this.cubes[i])) {
                volumeVariance[next] =
                    this.cubes[next].vol > 1 ? this.variance(this.cubes[next]) : 0.0;
                volumeVariance[i] =
                    this.cubes[i].vol > 1 ? this.variance(this.cubes[i]) : 0.0;
            }
            else {
                volumeVariance[next] = 0.0;
                i--;
            }
            next = 0;
            let temp = volumeVariance[0];
            for (let j = 1; j <= i; j++) {
                if (volumeVariance[j] > temp) {
                    temp = volumeVariance[j];
                    next = j;
                }
            }
            if (temp <= 0.0) {
                generatedColorCount = i + 1;
                break;
            }
        }
        return new CreateBoxesResult(maxColors, generatedColorCount);
    }
    createResult(colorCount) {
        const colors = [];
        for (let i = 0; i < colorCount; ++i) {
            const cube = this.cubes[i];
            const weight = this.volume(cube, this.weights);
            if (weight > 0) {
                const r = Math.round(this.volume(cube, this.momentsR) / weight);
                const g = Math.round(this.volume(cube, this.momentsG) / weight);
                const b = Math.round(this.volume(cube, this.momentsB) / weight);
                const color = (255 << 24) | ((r & 0x0ff) << 16) | ((g & 0x0ff) << 8) |
                    (b & 0x0ff);
                colors.push(color);
            }
        }
        return colors;
    }
    variance(cube) {
        const dr = this.volume(cube, this.momentsR);
        const dg = this.volume(cube, this.momentsG);
        const db = this.volume(cube, this.momentsB);
        const xx = this.moments[this.getIndex(cube.r1, cube.g1, cube.b1)] -
            this.moments[this.getIndex(cube.r1, cube.g1, cube.b0)] -
            this.moments[this.getIndex(cube.r1, cube.g0, cube.b1)] +
            this.moments[this.getIndex(cube.r1, cube.g0, cube.b0)] -
            this.moments[this.getIndex(cube.r0, cube.g1, cube.b1)] +
            this.moments[this.getIndex(cube.r0, cube.g1, cube.b0)] +
            this.moments[this.getIndex(cube.r0, cube.g0, cube.b1)] -
            this.moments[this.getIndex(cube.r0, cube.g0, cube.b0)];
        const hypotenuse = dr * dr + dg * dg + db * db;
        const volume = this.volume(cube, this.weights);
        return xx - hypotenuse / volume;
    }
    cut(one, two) {
        const wholeR = this.volume(one, this.momentsR);
        const wholeG = this.volume(one, this.momentsG);
        const wholeB = this.volume(one, this.momentsB);
        const wholeW = this.volume(one, this.weights);
        const maxRResult = this.maximize(one, directions.RED, one.r0 + 1, one.r1, wholeR, wholeG, wholeB, wholeW);
        const maxGResult = this.maximize(one, directions.GREEN, one.g0 + 1, one.g1, wholeR, wholeG, wholeB, wholeW);
        const maxBResult = this.maximize(one, directions.BLUE, one.b0 + 1, one.b1, wholeR, wholeG, wholeB, wholeW);
        let direction;
        const maxR = maxRResult.maximum;
        const maxG = maxGResult.maximum;
        const maxB = maxBResult.maximum;
        if (maxR >= maxG && maxR >= maxB) {
            if (maxRResult.cutLocation < 0) {
                return false;
            }
            direction = directions.RED;
        }
        else if (maxG >= maxR && maxG >= maxB) {
            direction = directions.GREEN;
        }
        else {
            direction = directions.BLUE;
        }
        two.r1 = one.r1;
        two.g1 = one.g1;
        two.b1 = one.b1;
        switch (direction) {
            case directions.RED:
                one.r1 = maxRResult.cutLocation;
                two.r0 = one.r1;
                two.g0 = one.g0;
                two.b0 = one.b0;
                break;
            case directions.GREEN:
                one.g1 = maxGResult.cutLocation;
                two.r0 = one.r0;
                two.g0 = one.g1;
                two.b0 = one.b0;
                break;
            case directions.BLUE:
                one.b1 = maxBResult.cutLocation;
                two.r0 = one.r0;
                two.g0 = one.g0;
                two.b0 = one.b1;
                break;
            default:
                throw new Error('unexpected direction ' + direction);
        }
        one.vol = (one.r1 - one.r0) * (one.g1 - one.g0) * (one.b1 - one.b0);
        two.vol = (two.r1 - two.r0) * (two.g1 - two.g0) * (two.b1 - two.b0);
        return true;
    }
    maximize(cube, direction, first, last, wholeR, wholeG, wholeB, wholeW) {
        const bottomR = this.bottom(cube, direction, this.momentsR);
        const bottomG = this.bottom(cube, direction, this.momentsG);
        const bottomB = this.bottom(cube, direction, this.momentsB);
        const bottomW = this.bottom(cube, direction, this.weights);
        let max = 0.0;
        let cut = -1;
        let halfR = 0;
        let halfG = 0;
        let halfB = 0;
        let halfW = 0;
        for (let i = first; i < last; i++) {
            halfR = bottomR + this.top(cube, direction, i, this.momentsR);
            halfG = bottomG + this.top(cube, direction, i, this.momentsG);
            halfB = bottomB + this.top(cube, direction, i, this.momentsB);
            halfW = bottomW + this.top(cube, direction, i, this.weights);
            if (halfW === 0) {
                continue;
            }
            let tempNumerator = (halfR * halfR + halfG * halfG + halfB * halfB) * 1.0;
            let tempDenominator = halfW * 1.0;
            let temp = tempNumerator / tempDenominator;
            halfR = wholeR - halfR;
            halfG = wholeG - halfG;
            halfB = wholeB - halfB;
            halfW = wholeW - halfW;
            if (halfW === 0) {
                continue;
            }
            tempNumerator = (halfR * halfR + halfG * halfG + halfB * halfB) * 1.0;
            tempDenominator = halfW * 1.0;
            temp += tempNumerator / tempDenominator;
            if (temp > max) {
                max = temp;
                cut = i;
            }
        }
        return new MaximizeResult(cut, max);
    }
    volume(cube, moment) {
        return (moment[this.getIndex(cube.r1, cube.g1, cube.b1)] -
            moment[this.getIndex(cube.r1, cube.g1, cube.b0)] -
            moment[this.getIndex(cube.r1, cube.g0, cube.b1)] +
            moment[this.getIndex(cube.r1, cube.g0, cube.b0)] -
            moment[this.getIndex(cube.r0, cube.g1, cube.b1)] +
            moment[this.getIndex(cube.r0, cube.g1, cube.b0)] +
            moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
            moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);
    }
    bottom(cube, direction, moment) {
        switch (direction) {
            case directions.RED:
                return (-moment[this.getIndex(cube.r0, cube.g1, cube.b1)] +
                    moment[this.getIndex(cube.r0, cube.g1, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);
            case directions.GREEN:
                return (-moment[this.getIndex(cube.r1, cube.g0, cube.b1)] +
                    moment[this.getIndex(cube.r1, cube.g0, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g0, cube.b1)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);
            case directions.BLUE:
                return (-moment[this.getIndex(cube.r1, cube.g1, cube.b0)] +
                    moment[this.getIndex(cube.r1, cube.g0, cube.b0)] +
                    moment[this.getIndex(cube.r0, cube.g1, cube.b0)] -
                    moment[this.getIndex(cube.r0, cube.g0, cube.b0)]);
            default:
                throw new Error('unexpected direction $direction');
        }
    }
    top(cube, direction, position, moment) {
        switch (direction) {
            case directions.RED:
                return (moment[this.getIndex(position, cube.g1, cube.b1)] -
                    moment[this.getIndex(position, cube.g1, cube.b0)] -
                    moment[this.getIndex(position, cube.g0, cube.b1)] +
                    moment[this.getIndex(position, cube.g0, cube.b0)]);
            case directions.GREEN:
                return (moment[this.getIndex(cube.r1, position, cube.b1)] -
                    moment[this.getIndex(cube.r1, position, cube.b0)] -
                    moment[this.getIndex(cube.r0, position, cube.b1)] +
                    moment[this.getIndex(cube.r0, position, cube.b0)]);
            case directions.BLUE:
                return (moment[this.getIndex(cube.r1, cube.g1, position)] -
                    moment[this.getIndex(cube.r1, cube.g0, position)] -
                    moment[this.getIndex(cube.r0, cube.g1, position)] +
                    moment[this.getIndex(cube.r0, cube.g0, position)]);
            default:
                throw new Error('unexpected direction $direction');
        }
    }
    getIndex(r, g, b) {
        return (r << (INDEX_BITS * 2)) + (r << (INDEX_BITS + 1)) + r +
            (g << INDEX_BITS) + g + b;
    }
}
/**
 * Keeps track of the state of each box created as the Wu  quantization
 * algorithm progresses through dividing the image's pixels as plotted in RGB.
 */
class Box {
    constructor(r0 = 0, r1 = 0, g0 = 0, g1 = 0, b0 = 0, b1 = 0, vol = 0) {
        this.r0 = r0;
        this.r1 = r1;
        this.g0 = g0;
        this.g1 = g1;
        this.b0 = b0;
        this.b1 = b1;
        this.vol = vol;
    }
}
/**
 * Represents final result of Wu algorithm.
 */
class CreateBoxesResult {
    /**
     * @param requestedCount how many colors the caller asked to be returned from
     *     quantization.
     * @param resultCount the actual number of colors achieved from quantization.
     *     May be lower than the requested count.
     */
    constructor(requestedCount, resultCount) {
        this.requestedCount = requestedCount;
        this.resultCount = resultCount;
    }
}
/**
 * Represents the result of calculating where to cut an existing box in such
 * a way to maximize variance between the two new boxes created by a cut.
 */
class MaximizeResult {
    constructor(cutLocation, maximum) {
        this.cutLocation = cutLocation;
        this.maximum = maximum;
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * An image quantizer that improves on the quality of a standard K-Means
 * algorithm by setting the K-Means initial state to the output of a Wu
 * quantizer, instead of random centroids. Improves on speed by several
 * optimizations, as implemented in Wsmeans, or Weighted Square Means, K-Means
 * with those optimizations.
 *
 * This algorithm was designed by M. Emre Celebi, and was found in their 2011
 * paper, Improving the Performance of K-Means for Color Quantization.
 * https://arxiv.org/abs/1101.0395
 */
// material_color_utilities is designed to have a consistent API across
// platforms and modular components that can be moved around easily. Using a
// class as a namespace facilitates this.
//
// tslint:disable-next-line:class-as-namespace
class QuantizerCelebi {
    /**
     * @param pixels Colors in ARGB format.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Map with keys of colors in ARGB format, and values of number of
     *     pixels in the original image that correspond to the color in the
     *     quantized image.
     */
    static quantize(pixels, maxColors) {
        const wu = new QuantizerWu();
        const wuResult = wu.quantize(pixels, maxColors);
        return QuantizerWsmeans.quantize(pixels, wuResult, maxColors);
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A scheme that places the source color in `Scheme.primaryContainer`.
 *
 * Primary Container is the source color, adjusted for color relativity.
 * It maintains constant appearance in light mode and dark mode.
 * This adds ~5 tone in light mode, and subtracts ~5 tone in dark mode.
 * Tertiary Container is the complement to the source color, using
 * `TemperatureCache`. It also maintains constant appearance.
 */
class SchemeContent extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.CONTENT,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A Dynamic Color theme that is intentionally detached from the source color.
 */
class SchemeExpressive extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.EXPRESSIVE,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A scheme that places the source color in `Scheme.primaryContainer`.
 *
 * Primary Container is the source color, adjusted for color relativity.
 * It maintains constant appearance in light mode and dark mode.
 * This adds ~5 tone in light mode, and subtracts ~5 tone in dark mode.
 * Tertiary Container is the complement to the source color, using
 * `TemperatureCache`. It also maintains constant appearance.
 */
class SchemeFidelity extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.FIDELITY,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A playful theme - the source color's hue does not appear in the theme.
 */
class SchemeFruitSalad extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.FRUIT_SALAD,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** A Dynamic Color theme that is grayscale. */
class SchemeMonochrome extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.MONOCHROME,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** A Dynamic Color theme that is near grayscale. */
class SchemeNeutral extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.NEUTRAL,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A playful theme - the source color's hue does not appear in the theme.
 */
class SchemeRainbow extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.RAINBOW,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A Dynamic Color theme with low to medium colorfulness and a Tertiary
 * TonalPalette with a hue related to the source color.
 *
 * The default Material You theme on Android 12 and 13.
 */
class SchemeTonalSpot extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.TONAL_SPOT,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A Dynamic Color theme that maxes out colorfulness at each position in the
 * Primary Tonal Palette.
 */
class SchemeVibrant extends DynamicScheme {
    constructor(sourceColorHct, isDark, contrastLevel, specVersion = DynamicScheme.DEFAULT_SPEC_VERSION, platform = DynamicScheme.DEFAULT_PLATFORM) {
        super({
            sourceColorHct,
            variant: Variant.VIBRANT,
            contrastLevel,
            isDark,
            platform,
            specVersion,
        });
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const SCORE_OPTION_DEFAULTS = {
    desired: 4,
    fallbackColorARGB: 0xff4285f4,
    filter: true, // Avoid unsuitable colors.
};
function compare(a, b) {
    if (a.score > b.score) {
        return -1;
    }
    else if (a.score < b.score) {
        return 1;
    }
    return 0;
}
/**
 *  Given a large set of colors, remove colors that are unsuitable for a UI
 *  theme, and rank the rest based on suitability.
 *
 *  Enables use of a high cluster count for image quantization, thus ensuring
 *  colors aren't muddied, while curating the high cluster count to a much
 *  smaller number of appropriate choices.
 */
class Score {
    constructor() { }
    /**
     * Given a map with keys of colors and values of how often the color appears,
     * rank the colors based on suitability for being used for a UI theme.
     *
     * @param colorsToPopulation map with keys of colors and values of how often
     *     the color appears, usually from a source image.
     * @param {ScoreOptions} options optional parameters.
     * @return Colors sorted by suitability for a UI theme. The most suitable
     *     color is the first item, the least suitable is the last. There will
     *     always be at least one color returned. If all the input colors
     *     were not suitable for a theme, a default fallback color will be
     *     provided, Google Blue.
     */
    static score(colorsToPopulation, options) {
        const { desired, fallbackColorARGB, filter } = { ...SCORE_OPTION_DEFAULTS, ...options };
        // Get the HCT color for each Argb value, while finding the per hue count and
        // total count.
        const colorsHct = [];
        const huePopulation = new Array(360).fill(0);
        let populationSum = 0;
        for (const [argb, population] of colorsToPopulation.entries()) {
            const hct = Hct.fromInt(argb);
            colorsHct.push(hct);
            const hue = Math.floor(hct.hue);
            huePopulation[hue] += population;
            populationSum += population;
        }
        // Hues with more usage in neighboring 30 degree slice get a larger number.
        const hueExcitedProportions = new Array(360).fill(0.0);
        for (let hue = 0; hue < 360; hue++) {
            const proportion = huePopulation[hue] / populationSum;
            for (let i = hue - 14; i < hue + 16; i++) {
                const neighborHue = sanitizeDegreesInt(i);
                hueExcitedProportions[neighborHue] += proportion;
            }
        }
        // Scores each HCT color based on usage and chroma, while optionally
        // filtering out values that do not have enough chroma or usage.
        const scoredHct = new Array();
        for (const hct of colorsHct) {
            const hue = sanitizeDegreesInt(Math.round(hct.hue));
            const proportion = hueExcitedProportions[hue];
            if (filter && (hct.chroma < Score.CUTOFF_CHROMA || proportion <= Score.CUTOFF_EXCITED_PROPORTION)) {
                continue;
            }
            const proportionScore = proportion * 100.0 * Score.WEIGHT_PROPORTION;
            const chromaWeight = hct.chroma < Score.TARGET_CHROMA ? Score.WEIGHT_CHROMA_BELOW : Score.WEIGHT_CHROMA_ABOVE;
            const chromaScore = (hct.chroma - Score.TARGET_CHROMA) * chromaWeight;
            const score = proportionScore + chromaScore;
            scoredHct.push({ hct, score });
        }
        // Sorted so that colors with higher scores come first.
        scoredHct.sort(compare);
        // Iterates through potential hue differences in degrees in order to select
        // the colors with the largest distribution of hues possible. Starting at
        // 90 degrees(maximum difference for 4 colors) then decreasing down to a
        // 15 degree minimum.
        const chosenColors = [];
        for (let differenceDegrees$1 = 90; differenceDegrees$1 >= 15; differenceDegrees$1--) {
            chosenColors.length = 0;
            for (const { hct } of scoredHct) {
                const duplicateHue = chosenColors.find(chosenHct => {
                    return differenceDegrees(hct.hue, chosenHct.hue) < differenceDegrees$1;
                });
                if (!duplicateHue) {
                    chosenColors.push(hct);
                }
                if (chosenColors.length >= desired)
                    break;
            }
            if (chosenColors.length >= desired)
                break;
        }
        const colors = [];
        if (chosenColors.length === 0) {
            colors.push(fallbackColorARGB);
        }
        for (const chosenHct of chosenColors) {
            colors.push(chosenHct.toInt());
        }
        return colors;
    }
}
Score.TARGET_CHROMA = 48.0; // A1 Chroma
Score.WEIGHT_PROPORTION = 0.7;
Score.WEIGHT_CHROMA_ABOVE = 0.3;
Score.WEIGHT_CHROMA_BELOW = 0.1;
Score.CUTOFF_CHROMA = 5.0;
Score.CUTOFF_EXCITED_PROPORTION = 0.01;

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Utility methods for hexadecimal representations of colors.
 */
/**
 * @param argb ARGB representation of a color.
 * @return Hex string representing color, ex. #ff0000 for red.
 */
function hexFromArgb(argb) {
    const r = redFromArgb(argb);
    const g = greenFromArgb(argb);
    const b = blueFromArgb(argb);
    const outParts = [r.toString(16), g.toString(16), b.toString(16)];
    // Pad single-digit output values
    for (const [i, part] of outParts.entries()) {
        if (part.length === 1) {
            outParts[i] = '0' + part;
        }
    }
    return '#' + outParts.join('');
}
/**
 * @param hex String representing color as hex code. Accepts strings with or
 *     without leading #, and string representing the color using 3, 6, or 8
 *     hex characters.
 * @return ARGB representation of color.
 */
function argbFromHex(hex) {
    hex = hex.replace('#', '');
    const isThree = hex.length === 3;
    const isSix = hex.length === 6;
    const isEight = hex.length === 8;
    if (!isThree && !isSix && !isEight) {
        throw new Error('unexpected hex ' + hex);
    }
    let r = 0;
    let g = 0;
    let b = 0;
    if (isThree) {
        r = parseIntHex(hex.slice(0, 1).repeat(2));
        g = parseIntHex(hex.slice(1, 2).repeat(2));
        b = parseIntHex(hex.slice(2, 3).repeat(2));
    }
    else if (isSix) {
        r = parseIntHex(hex.slice(0, 2));
        g = parseIntHex(hex.slice(2, 4));
        b = parseIntHex(hex.slice(4, 6));
    }
    else if (isEight) {
        r = parseIntHex(hex.slice(2, 4));
        g = parseIntHex(hex.slice(4, 6));
        b = parseIntHex(hex.slice(6, 8));
    }
    return (((255 << 24) | ((r & 0x0ff) << 16) | ((g & 0x0ff) << 8) | (b & 0x0ff)) >>>
        0);
}
function parseIntHex(value) {
    // tslint:disable-next-line:ban
    return parseInt(value, 16);
}

const SCHEME_CHARACTERS = [
  { value: "tonal_spot", label: "Tonal" },
  { value: "vibrant", label: "Vibrant" },
  { value: "expressive", label: "Expressive" },
  { value: "neutral", label: "Neutral" },
  { value: "monochrome", label: "Monochrome" },
  { value: "fidelity", label: "Fidelity" },
  { value: "content", label: "Content" },
  { value: "rainbow", label: "Rainbow" },
  { value: "fruit_salad", label: "Fruit Salad" }
];
const FINISHES = [
  { value: "natural", label: "Natürlich" },
  { value: "pastel", label: "Pastell" },
  { value: "muted", label: "Gedämpft" },
  { value: "vibrant", label: "Kräftig" }
];
const SCHEME_CTORS = {
  tonal_spot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  fruit_salad: SchemeFruitSalad
};
function generateTheme(seedHex, mode, character = "vibrant", finish = "natural", contrast = 0) {
  let argb;
  try {
    argb = argbFromHex(seedHex);
  } catch {
    argb = argbFromHex("#ff6b35");
  }
  let hct = Hct.fromInt(argb);
  const mul = finish === "pastel" ? 0.5 : finish === "muted" ? 0.3 : finish === "vibrant" ? 1.6 : 1;
  if (mul !== 1) hct = Hct.from(hct.hue, Math.min(hct.chroma * mul, 120), hct.tone);
  const Ctor = SCHEME_CTORS[character] ?? SchemeVibrant;
  const isDark = mode === "dark";
  const scheme = new Ctor(hct, isDark, Math.max(-1, Math.min(1, contrast)));
  const C = MaterialDynamicColors;
  const hx = (c) => hexFromArgb(c.getArgb(scheme));
  const primHct = Hct.fromInt(C.primary.getArgb(scheme));
  const hover = hexFromArgb(
    Hct.from(
      primHct.hue,
      primHct.chroma,
      isDark ? Math.min(primHct.tone + 8, 100) : Math.max(primHct.tone - 8, 0)
    ).toInt()
  );
  const tokens = {
    bg: hx(C.surface),
    "bg-elevated": hx(C.surfaceContainer),
    "bg-hover": hx(C.surfaceContainerHigh),
    "bg-active": hx(C.surfaceContainerHighest),
    border: hx(C.outlineVariant),
    text: hx(C.onSurface),
    "text-muted": hx(C.onSurfaceVariant),
    "text-faint": hx(C.outline),
    accent: hx(C.primary),
    "accent-hover": hover,
    "accent-text": hx(C.onPrimary),
    shadow: isDark ? "0 8px 32px rgba(0,0,0,0.45)" : "0 8px 32px rgba(0,0,0,0.12)"
  };
  const roles = {
    primary: hx(C.primary),
    secondary: hx(C.secondary),
    tertiary: hx(C.tertiary),
    surface: hx(C.surface),
    surfaceVariant: hx(C.surfaceContainerHighest),
    outline: hx(C.outline),
    onSurface: hx(C.onSurface)
  };
  return { tokens, roles };
}
async function seedFromImage(src) {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 128 / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 255) continue;
      pixels.push(255 << 24 | data[i] << 16 | data[i + 1] << 8 | data[i + 2]);
    }
    if (pixels.length === 0) return null;
    const quantized = QuantizerCelebi.quantize(pixels, 64);
    const ranked = Score.score(quantized);
    return ranked.length ? hexFromArgb(ranked[0]) : null;
  } catch {
    return null;
  }
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const PLUGIN_ID = "skwd-wall";
class WallpaperManager {
  constructor(app) {
    this.app = app;
    const saved = app.config.get(PLUGIN_ID, "state");
    const merged = { ...DEFAULT_STATE, ...saved ?? {} };
    const seen = /* @__PURE__ */ new Set();
    const deduped = (merged.items ?? []).filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    const hadDupes = deduped.length !== (merged.items ?? []).length;
    merged.items = deduped;
    let migrated = hadDupes;
    if (merged.hexColumns > 6) {
      merged.hexColumns = 3;
      migrated = true;
    }
    this.state = new Store(merged);
    if (migrated) this.persist();
  }
  state;
  /** id → object URL cache for display, reactive. */
  urls = new Store({});
  /** id → sharper downscaled preview URL used ONLY for the app background. */
  bgCache = /* @__PURE__ */ new Map();
  bgResolving = /* @__PURE__ */ new Set();
  unsubResolved;
  idCounter = 0;
  // Platform powers via the core capability API. Each is undefined where the
  // current device can't provide it (e.g. no folders on a non-Chromium browser,
  // no wallpaper on web), so every call site uses optional chaining.
  get folders() {
    return this.app.capabilities.get("folders");
  }
  get live() {
    return this.app.capabilities.get("live-wallpaper");
  }
  get sysWallpaper() {
    return this.app.capabilities.get("wallpaper");
  }
  rotationTimer = null;
  scheduleTimer = null;
  firedScheduleKeys = /* @__PURE__ */ new Set();
  async start() {
    void this.probeFolders();
    await this.refreshUrls();
    void this.cleanupTrash();
    this.applyActive();
    this.applyFill();
    this.restartRotation();
    this.restartScheduler();
    this.pushLive();
    this.unsubResolved = this.app.theme.resolved.subscribe(() => this.applyActive());
  }
  stop() {
    this.unsubResolved?.();
    this.stopRotation();
    this.stopScheduler();
    for (const url of Object.values(this.urls.get())) URL.revokeObjectURL(url);
    for (const url of this.bgCache.values()) URL.revokeObjectURL(url);
    this.bgCache.clear();
  }
  /**
   * Wipe ALL plugin data: uploaded image blobs (IndexedDB) + the whole state
   * (library, collections, folder sources, settings) back to defaults. Used by
   * the "Daten löschen" action in the Plugins area.
   */
  async clearAllData() {
    for (const url of Object.values(this.urls.get())) URL.revokeObjectURL(url);
    for (const url of this.bgCache.values()) URL.revokeObjectURL(url);
    this.bgCache.clear();
    this.urls.set({});
    await clearAllImages();
    this.state.set({ ...DEFAULT_STATE });
    this.persist();
    this.lastLiveSig = null;
    this.applyActive();
    this.pushLive();
  }
  /** Apply the wallpaper fit mode as CSS vars read by the #app-wallpaper layer. */
  applyFill() {
    const root = document.documentElement.style;
    const map = {
      cover: ["cover", "no-repeat", "center"],
      contain: ["contain", "no-repeat", "center"],
      stretch: ["100% 100%", "no-repeat", "center"],
      center: ["auto", "no-repeat", "center"],
      tile: ["auto", "repeat", "top left"]
    };
    const [size, repeat, pos] = map[this.state.get().fillMode] ?? map.cover;
    root.setProperty("--wallpaper-size", size);
    root.setProperty("--wallpaper-repeat", repeat);
    root.setProperty("--wallpaper-position", pos);
  }
  // --- Auto rotation ---
  stopRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
  restartRotation() {
    this.stopRotation();
    const s = this.state.get();
    if (!s.randomEnabled) return;
    const ms = Math.max(5, s.randomIntervalSec) * 1e3;
    this.rotationTimer = setInterval(() => this.rotateOnce(), ms);
  }
  rotateOnce() {
    const s = this.state.get();
    let pool = s.items.filter((i) => {
      const k = i.kind ?? "image";
      if (k === "image" && !s.includeImages) return false;
      if (k === "video" && !s.includeVideos) return false;
      return true;
    });
    if (s.activeCollectionId) {
      const col = s.collections.find((c) => c.id === s.activeCollectionId);
      const ids = new Set(col?.itemIds ?? []);
      pool = pool.filter((i) => ids.has(i.id));
    }
    if (s.randomFavOnly) pool = pool.filter((i) => i.favorite);
    if (pool.length < 2) return;
    const others = pool.filter((i) => i.id !== s.activeId);
    const pick = others[Math.floor(Math.random() * others.length)] ?? pool[0];
    this.setActive(pick.id);
    this.pushToOsIfEnabled(pick.id);
  }
  /** Mirror a wallpaper to the real OS home/lock screen if those toggles are on. */
  pushToOsIfEnabled(id) {
    const s = this.state.get();
    if (s.liveWallpaper) return;
    if (!((s.randomSetHome || s.randomSetLock) && this.sysWallpaper)) return;
    const target = s.randomSetHome && s.randomSetLock ? "both" : s.randomSetHome ? "home" : "lock";
    void (async () => {
      const full = await this.fullUrl(id);
      if (!full) return;
      try {
        await this.sysWallpaper?.setSystem(full, target);
      } catch {
      } finally {
        URL.revokeObjectURL(full);
      }
    })();
  }
  // --- Time scheduling ---
  stopScheduler() {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }
  restartScheduler() {
    this.stopScheduler();
    if (!this.state.get().scheduleEnabled) return;
    this.scheduleTimer = setInterval(() => this.checkSchedule(), 3e4);
    this.checkSchedule();
  }
  checkSchedule() {
    const s = this.state.get();
    if (!s.scheduleEnabled || s.schedule.length === 0) return;
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const cur = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    for (const rule of s.schedule) {
      if (rule.time !== cur) continue;
      const key = `${day}-${rule.id}-${cur}`;
      if (this.firedScheduleKeys.has(key)) continue;
      this.firedScheduleKeys.add(key);
      this.applyScheduleRule(rule);
    }
    if (this.firedScheduleKeys.size > 200) {
      for (const k of this.firedScheduleKeys) if (!k.startsWith(day)) this.firedScheduleKeys.delete(k);
    }
  }
  applyScheduleRule(rule) {
    const s = this.state.get();
    if (rule.targetType === "item" && rule.targetId) {
      if (s.items.some((i) => i.id === rule.targetId)) {
        this.setActive(rule.targetId);
        this.pushToOsIfEnabled(rule.targetId);
      }
    } else if (rule.targetType === "collection" && rule.targetId) {
      this.setActiveCollection(rule.targetId);
      const col = s.collections.find((c) => c.id === rule.targetId);
      const first = col?.itemIds.find((id) => s.items.some((i) => i.id === id));
      if (first) {
        this.setActive(first);
        this.pushToOsIfEnabled(first);
      }
    } else {
      const pick = s.items[Math.floor(Math.random() * s.items.length)];
      if (pick) {
        this.setActive(pick.id);
        this.pushToOsIfEnabled(pick.id);
      }
    }
  }
  persist() {
    this.app.config.set(PLUGIN_ID, "state", this.state.get());
  }
  async refreshUrls() {
    const map = {};
    const s = this.state.get();
    for (const item of [...s.items, ...s.trashedItems]) {
      if (!item.folderId) {
        const url = await imageUrl(item.id);
        if (url) map[item.id] = url;
      }
    }
    this.urls.set(map);
    const activeId = s.activeId;
    if (activeId) void this.ensureUrl(activeId);
  }
  resolving = /* @__PURE__ */ new Set();
  /** Resolve a single item's object URL on demand (idempotent). */
  async ensureUrl(id) {
    if (this.urls.get()[id] || this.resolving.has(id)) return;
    const all = [...this.state.get().items, ...this.state.get().trashedItems];
    const item = all.find((it) => it.id === id);
    if (!item) return;
    this.resolving.add(id);
    try {
      const url = item.folderId ? await this.folders?.thumbUrl(item.folderId, item.fileName ?? item.name, item.kind ?? "image") ?? null : await imageUrl(item.id);
      if (url) {
        this.urls.update((m) => ({ ...m, [id]: url }));
        if (id === this.state.get().activeId) this.applyActive();
      }
    } finally {
      this.resolving.delete(id);
    }
  }
  /** A fresh FULL-resolution object URL for applying (system/live wallpaper).
   *  Caller must revokeObjectURL() when done. Null if unavailable. */
  async fullUrl(id) {
    const item = [...this.state.get().items, ...this.state.get().trashedItems].find((it) => it.id === id);
    if (!item) return null;
    return item.folderId ? await this.folders?.fileUrl(item.folderId, item.fileName ?? item.name) ?? null : imageUrl(item.id);
  }
  /** Free a folder-backed object URL once its tile scrolls far off screen, so
   *  a big external folder keeps only the on-screen images in memory. IndexedDB
   *  blobs are cheap to keep; only folder sources (full-res, native reads) are
   *  released. Never releases the active item. */
  releaseUrl(id) {
    if (id === this.state.get().activeId) return;
    const item = this.state.get().items.find((it) => it.id === id);
    if (!item?.folderId) return;
    const url = this.urls.get()[id];
    if (!url) return;
    URL.revokeObjectURL(url);
    this.urls.update((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  }
  getUrl(id) {
    return this.urls.get()[id];
  }
  /**
   * Generic setter used by the declarative settings UI (SettingsView): write any
   * state field by key + run the right side effect. Keeps settings DRY.
   */
  setField(key, value) {
    this.state.update((s) => ({ ...s, [key]: value }));
    this.persist();
    switch (key) {
      case "schemeCharacter":
      case "finish":
      case "paletteBehaviour":
      case "fixedSeed":
      case "themeContrast":
      case "sourceColourIndex":
        this.applyTheme();
        break;
      case "uiScale":
        this.applyTheme();
        this.applyUiScale();
        break;
      case "fillMode":
        this.applyFill();
        break;
      case "dim":
        this.applyActive();
        break;
      case "randomEnabled":
      case "randomIntervalSec":
      case "randomFavOnly":
      case "includeImages":
      case "includeVideos":
      case "activeCollectionId":
        this.restartRotation();
        this.lastLiveSig = null;
        this.pushLive();
        break;
      case "scheduleEnabled":
        this.restartScheduler();
        break;
      case "transitionType":
      case "transitionMs":
      case "randomShader":
        this.syncLiveTransition();
        break;
      case "liveWallpaper":
      case "deviceMobile":
        this.lastLiveSig = null;
        this.pushLive();
        break;
      case "muteVideo":
      case "videoVolume":
        this.applyVideoAudio();
        break;
    }
  }
  randomGpuType() {
    const gpu = TRANSITIONS.filter((t) => t.gpu).map((t) => t.value);
    return gpu.length ? gpu[Math.floor(Math.random() * gpu.length)] : "fade";
  }
  /** Apply mute/volume to the in-app background video (if any). */
  applyVideoAudio() {
    const v = document.querySelector("#app-wallpaper video");
    if (!v) return;
    const s = this.state.get();
    v.muted = s.muteVideo;
    v.volume = Math.max(0, Math.min(1, s.videoVolume / 100));
  }
  // --- Trash (soft-delete with recovery) ---
  restoreFromTrash(id) {
    const t = this.state.get().trashedItems.find((x) => x.id === id);
    if (!t) return;
    this.state.update((s) => ({
      ...s,
      trashedItems: s.trashedItems.filter((x) => x.id !== id),
      items: [...s.items, { id: t.id, name: t.name, kind: t.kind, accent: t.accent, tags: t.tags, folderId: t.folderId, fileName: t.fileName }]
    }));
    this.persist();
    if (!this.state.get().activeId) this.setActive(id);
    this.lastLiveSig = null;
    this.pushLive();
  }
  async purgeFromTrash(id) {
    await deleteImage(id);
    const url = this.urls.get()[id];
    if (url) URL.revokeObjectURL(url);
    this.urls.update((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    this.state.update((s) => ({ ...s, trashedItems: s.trashedItems.filter((x) => x.id !== id) }));
    this.persist();
  }
  async emptyTrash() {
    for (const t of [...this.state.get().trashedItems]) await this.purgeFromTrash(t.id);
  }
  async cleanupTrash() {
    const s = this.state.get();
    if (!s.trashAutoDelete) return;
    const cutoff = Date.now() - s.trashRetentionDays * 864e5;
    for (const t of s.trashedItems.filter((x) => x.deletedAt < cutoff)) {
      await this.purgeFromTrash(t.id);
    }
  }
  // --- Geometry presets (SELECTOR C1–C4) ---
  saveGeometryPreset(slot) {
    const s = this.state.get();
    const snap = {
      viewMode: s.viewMode,
      wallColumns: s.wallColumns,
      slicesSkew: s.slicesSkew,
      slicesHeight: s.slicesHeight,
      hexSize: s.hexSize,
      hexRows: s.hexRows,
      hexColumns: s.hexColumns,
      hexScrollStep: s.hexScrollStep,
      hexArc: s.hexArc,
      hexArcIntensity: s.hexArcIntensity,
      depthTilt: s.depthTilt,
      handSpread: s.handSpread
    };
    this.state.update((st) => {
      const presets = [...st.geometryPresets];
      presets[slot] = snap;
      return { ...st, geometryPresets: presets };
    });
    this.persist();
  }
  applyGeometryPreset(slot) {
    const p = this.state.get().geometryPresets[slot];
    if (!p) return;
    this.state.update((s) => ({ ...s, ...p }));
    this.persist();
  }
  clearGeometryPreset(slot) {
    this.state.update((st) => {
      const presets = [...st.geometryPresets];
      presets[slot] = null;
      return { ...st, geometryPresets: presets };
    });
    this.persist();
  }
  getActive() {
    const s = this.state.get();
    return s.items.find((i) => i.id === s.activeId) ?? void 0;
  }
  applyActive() {
    const s = this.state.get();
    const active = this.getActive();
    if (active && !this.bgCache.has(active.id)) void this.resolveBg(active.id);
    const url = active ? this.bgCache.get(active.id) ?? this.getUrl(active.id) ?? null : null;
    const type = s.randomShader ? this.randomGpuType() : s.transitionType;
    this.app.theme.setWallpaper({
      url,
      dim: s.dim,
      transition: { type, ms: s.transitionMs },
      kind: active?.kind ?? "image"
    });
    this.applyTheme();
    this.applyUiScale();
    this.applyVideoAudio();
  }
  /** Resolve the sharper background preview for one item, then re-apply if active. */
  async resolveBg(id) {
    if (this.bgCache.has(id) || this.bgResolving.has(id)) return;
    const item = [...this.state.get().items, ...this.state.get().trashedItems].find((it) => it.id === id);
    if (!item) return;
    this.bgResolving.add(id);
    try {
      const url = item.folderId ? await this.folders?.thumbUrl(item.folderId, item.fileName ?? item.name, item.kind ?? "image", 1600) ?? null : await imageUrl(item.id);
      if (url) {
        this.bgCache.set(id, url);
        if (id === this.state.get().activeId) this.applyActive();
      }
    } finally {
      this.bgResolving.delete(id);
    }
  }
  /** Regenerate + apply the full theme (chrome tokens + palette roles). */
  applyTheme() {
    const s = this.state.get();
    if (s.paletteBehaviour === "keep") return;
    const active = this.getActive();
    if (!active && s.paletteBehaviour !== "fixed") return;
    const seed = s.paletteBehaviour === "fixed" ? s.fixedSeed : active?.accent ?? s.fixedSeed;
    const { tokens, roles } = generateTheme(
      seed,
      this.app.theme.resolvedMode(),
      s.schemeCharacter,
      s.finish,
      s.themeContrast
    );
    const sc = s.uiScale;
    tokens["space-1"] = `${Math.round(4 * sc)}px`;
    tokens["space-2"] = `${Math.round(8 * sc)}px`;
    tokens["space-3"] = `${Math.round(12 * sc)}px`;
    tokens["space-4"] = `${Math.round(16 * sc)}px`;
    tokens["space-5"] = `${Math.round(24 * sc)}px`;
    tokens["space-6"] = `${Math.round(32 * sc)}px`;
    this.app.theme.setTokens(tokens);
    this.app.theme.setPalette(roles);
  }
  applyUiScale() {
    document.documentElement.style.fontSize = `${Math.round(16 * this.state.get().uiScale)}px`;
  }
  async addImage(file, opts) {
    const id = `wp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}-${this.idCounter++}`;
    const kind = file.type.startsWith("video") ? "video" : "image";
    await putImage(id, file);
    const url = URL.createObjectURL(file);
    this.urls.update((m) => ({ ...m, [id]: url }));
    const accent = kind === "image" ? await seedFromImage(url) ?? void 0 : void 0;
    const item = { id, name: file.name.replace(/\.[^.]+$/, ""), kind, accent };
    this.state.update((s) => ({ ...s, items: [...s.items, item] }));
    this.persist();
    if (!this.state.get().activeId) this.setActive(id);
    this.lastLiveSig = null;
    this.pushLive();
    if (!opts?.skipRecolour && kind === "image" && this.state.get().autoRecolour) {
      void this.addRecolouredCopy(url, item.name).catch(() => {
      });
    }
  }
  // ---- External folder sources -------------------------------------------
  // Point at a real directory; its media appear in the library without being
  // copied. Items carry {folderId, fileName} and resolve on demand.
  /** Open the picker, scan the folder and add its media as referenced items. */
  async addFolder(kind) {
    const picked = await this.folders?.pick() ?? null;
    if (!picked) return { ok: false, count: 0 };
    const files = await this.folders?.scan(picked.id, kind) ?? [];
    const newItems = files.map((f) => ({
      id: `fi-${picked.id}-${f.name}`,
      name: f.name.replace(/\.[^.]+$/, ""),
      kind: f.kind,
      folderId: picked.id,
      fileName: f.locator
    }));
    const source = { id: picked.id, name: picked.name, kind, connected: true, count: files.length };
    this.state.update((s) => {
      const kept = s.items.filter((it) => it.folderId !== picked.id);
      return { ...s, folders: [...s.folders, source], items: [...kept, ...newItems] };
    });
    this.persist();
    await this.refreshUrls();
    if (!this.state.get().activeId && newItems[0]) this.setActive(newItems[0].id);
    this.lastLiveSig = null;
    this.pushLive();
    return { ok: true, count: files.length };
  }
  /** Remove a folder source and all items that came from it. */
  async removeFolder(folderId) {
    this.state.update((s) => ({
      ...s,
      folders: s.folders.filter((f) => f.id !== folderId),
      items: s.items.filter((it) => it.folderId !== folderId)
    }));
    this.persist();
    await this.folders?.forget(folderId);
    await this.refreshUrls();
    this.lastLiveSig = null;
    this.pushLive();
  }
  /** Query-only check (no prompt) of which folders are still readable. */
  async probeFolders() {
    const folders = this.state.get().folders;
    if (!folders.length) return;
    let changed = false;
    for (const f of folders) {
      const files = await this.folders?.scan(f.id, f.kind) ?? null;
      const connected = files !== null;
      if (connected !== f.connected) {
        changed = true;
        this.state.update((s) => ({
          ...s,
          folders: s.folders.map((x) => x.id === f.id ? { ...x, connected, count: files ? files.length : x.count } : x)
        }));
      }
    }
    if (changed) {
      this.persist();
      await this.refreshUrls();
    }
  }
  /** Re-grant permission (user gesture) and rescan every folder after a reload. */
  async reconnectFolders() {
    const folders = this.state.get().folders;
    for (const f of folders) {
      const ok = await this.folders?.reconnect(f.id) ?? false;
      let count = f.count;
      let items = null;
      if (ok) {
        const files = await this.folders?.scan(f.id, f.kind) ?? [];
        count = files.length;
        items = files.map((file) => ({
          id: `fi-${f.id}-${file.name}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          kind: file.kind,
          folderId: f.id,
          fileName: file.locator
        }));
      }
      this.state.update((s) => ({
        ...s,
        folders: s.folders.map((x) => x.id === f.id ? { ...x, connected: ok, count } : x),
        items: items ? [...s.items.filter((it) => it.folderId !== f.id), ...items] : s.items
      }));
    }
    this.persist();
    await this.refreshUrls();
    this.lastLiveSig = null;
    this.pushLive();
  }
  recolourColors() {
    const s = this.state.get();
    if (s.recolourPalette !== "theme") {
      const pal = RECOLOUR_PALETTES.find((p2) => p2.value === s.recolourPalette);
      if (pal?.colors.length) return pal.colors;
    }
    const p = this.app.theme.palette.get();
    return [p.primary, p.secondary, p.tertiary, p.surface, p.surfaceVariant, p.outline, p.onSurface, "#000000", "#ffffff"];
  }
  async addRecolouredCopy(srcUrl, name) {
    const blob = await applyEffect(srcUrl, "recolor", this.recolourColors());
    const file = new File([blob], `${name} · recolor.jpg`, { type: "image/jpeg" });
    await this.addImage(file, { skipRecolour: true });
  }
  /** Soft-delete: move to trash (keep the blob) so it can be restored. */
  async removeImage(id) {
    const item = this.state.get().items.find((i) => i.id === id);
    this.state.update((s) => {
      const items = s.items.filter((i) => i.id !== id);
      const activeId = s.activeId === id ? items[0]?.id ?? null : s.activeId;
      const collections = s.collections.map((c) => ({
        ...c,
        itemIds: c.itemIds.filter((x) => x !== id)
      }));
      const trashedItems = item ? [
        ...s.trashedItems,
        { id: item.id, name: item.name, kind: item.kind, accent: item.accent, tags: item.tags, folderId: item.folderId, fileName: item.fileName, deletedAt: Date.now() }
      ] : s.trashedItems;
      return { ...s, items, activeId, collections, trashedItems };
    });
    this.persist();
    this.applyActive();
    this.lastLiveSig = null;
    this.pushLive();
  }
  setActive(id) {
    this.state.update((s) => ({ ...s, activeId: id }));
    this.persist();
    this.applyActive();
    this.pushLive();
  }
  lastLiveSig = null;
  /** The pool auto-rotation picks from (collection + favourites filters, images only). */
  rotationPool() {
    const s = this.state.get();
    let pool = s.items;
    if (s.activeCollectionId) {
      const col = s.collections.find((c) => c.id === s.activeCollectionId);
      const ids = new Set(col?.itemIds ?? []);
      pool = pool.filter((i) => ids.has(i.id));
    }
    if (s.randomFavOnly) pool = pool.filter((i) => i.favorite);
    return pool.filter((i) => (i.kind ?? "image") === "image");
  }
  /**
   * Keep the native live-wallpaper service in sync. With auto-change on, push a
   * rotation pool (the service cycles it on its OWN timer → the home screen keeps
   * changing even when the app is closed). Otherwise push the single active media.
   * Deduped by signature; deferred + downscaled/chunked so it never blocks.
   */
  /** Keep the live service's transition (type + duration) in sync with settings. */
  syncLiveTransition() {
    const s = this.state.get();
    if (!(s.liveWallpaper && s.deviceMobile && this.live)) return;
    const ms = s.transitionType === "none" ? 1 : s.transitionMs;
    void this.live.setTransition(s.transitionType, ms);
  }
  pushLive() {
    const s = this.state.get();
    if (!(s.liveWallpaper && s.deviceMobile && this.live)) return;
    this.syncLiveTransition();
    if (s.randomEnabled) {
      const pool = this.rotationPool().slice(0, 20);
      if (pool.length === 0) return;
      const sig = `rotate:${pool.map((i) => i.id).join(",")}:${s.randomIntervalSec}`;
      if (sig === this.lastLiveSig) return;
      this.lastLiveSig = sig;
      setTimeout(() => {
        void (async () => {
          const fulls = (await Promise.all(pool.map((i) => this.fullUrl(i.id)))).filter(
            (u) => !!u
          );
          if (fulls.length === 0) {
            this.lastLiveSig = null;
            return;
          }
          try {
            await this.live?.setPool(fulls, Math.max(2, s.randomIntervalSec) * 1e3, true);
          } catch {
            this.lastLiveSig = null;
          } finally {
            for (const u of fulls) URL.revokeObjectURL(u);
          }
        })();
      }, 300);
    } else {
      const active = this.getActive();
      if (!active) return;
      const sig = `single:${active.id}`;
      if (sig === this.lastLiveSig) return;
      this.lastLiveSig = sig;
      const kind = active.kind ?? "image";
      setTimeout(() => {
        void (async () => {
          const full = await this.fullUrl(active.id);
          if (!full) {
            this.lastLiveSig = null;
            return;
          }
          try {
            await this.live?.setMedia(full, kind);
          } catch {
            this.lastLiveSig = null;
          } finally {
            URL.revokeObjectURL(full);
          }
        })();
      }, 300);
    }
  }
  setViewMode(mode) {
    this.state.update((s) => ({ ...s, viewMode: mode }));
    this.persist();
  }
  setMenuSide(side) {
    this.state.update((s) => ({ ...s, menuSide: side }));
    this.persist();
  }
  setMenuMode(mode) {
    this.state.update((s) => ({ ...s, menuMode: mode }));
    this.persist();
  }
  setAutoHideMs(ms) {
    this.state.update((s) => ({ ...s, autoHideMs: ms }));
    this.persist();
  }
  setSchemeCharacter(c) {
    this.state.update((s) => ({ ...s, schemeCharacter: c }));
    this.persist();
    this.applyTheme();
  }
  setFinish(f) {
    this.state.update((s) => ({ ...s, finish: f }));
    this.persist();
    this.applyTheme();
  }
  setPaletteBehaviour(b) {
    this.state.update((s) => ({ ...s, paletteBehaviour: b }));
    this.persist();
    this.applyTheme();
  }
  setFixedSeed(hex) {
    this.state.update((s) => ({ ...s, fixedSeed: hex }));
    this.persist();
    if (this.state.get().paletteBehaviour === "fixed") this.applyTheme();
  }
  setUiScale(scale) {
    this.state.update((s) => ({ ...s, uiScale: scale }));
    this.persist();
    this.applyTheme();
    this.applyUiScale();
  }
  setThemeContrast(c) {
    this.state.update((s) => ({ ...s, themeContrast: Math.max(-1, Math.min(1, c)) }));
    this.persist();
    this.applyTheme();
  }
  // --- Theme presets ---
  saveThemePreset(name) {
    const s = this.state.get();
    const preset = {
      id: `tp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      name: name.trim() || "Preset",
      schemeCharacter: s.schemeCharacter,
      finish: s.finish,
      paletteBehaviour: s.paletteBehaviour,
      fixedSeed: s.fixedSeed,
      contrast: s.themeContrast
    };
    this.state.update((st) => ({ ...st, themePresets: [...st.themePresets, preset] }));
    this.persist();
  }
  applyThemePreset(id) {
    const p = this.state.get().themePresets.find((x) => x.id === id);
    if (!p) return;
    this.state.update((s) => ({
      ...s,
      schemeCharacter: p.schemeCharacter,
      finish: p.finish,
      paletteBehaviour: p.paletteBehaviour,
      fixedSeed: p.fixedSeed,
      themeContrast: p.contrast
    }));
    this.persist();
    this.applyTheme();
  }
  deleteThemePreset(id) {
    this.state.update((s) => ({ ...s, themePresets: s.themePresets.filter((x) => x.id !== id) }));
    this.persist();
  }
  exportThemePresets() {
    return JSON.stringify(this.state.get().themePresets, null, 2);
  }
  /** Import presets from JSON; appends with fresh ids. Returns count or -1 on error. */
  importThemePresets(json) {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return -1;
      const valid = parsed.filter((p) => p && typeof p.name === "string" && typeof p.fixedSeed === "string").map((p, i) => ({
        id: `tp-${Date.now().toString(36)}-${i}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        name: String(p.name),
        schemeCharacter: p.schemeCharacter ?? "vibrant",
        finish: p.finish ?? "natural",
        paletteBehaviour: p.paletteBehaviour ?? "fixed",
        fixedSeed: String(p.fixedSeed),
        contrast: typeof p.contrast === "number" ? p.contrast : 0
      }));
      if (!valid.length) return 0;
      this.state.update((s) => ({ ...s, themePresets: [...s.themePresets, ...valid] }));
      this.persist();
      return valid.length;
    } catch {
      return -1;
    }
  }
  setWallpaperTargets(home, lock) {
    this.state.update((s) => ({ ...s, setHome: home, setLock: lock }));
    this.persist();
  }
  setFillMode(m) {
    this.state.update((s) => ({ ...s, fillMode: m }));
    this.persist();
    this.applyFill();
  }
  setTileSize(px) {
    this.state.update((s) => ({ ...s, tileSize: px }));
    this.persist();
  }
  setTileRadius(px) {
    this.state.update((s) => ({ ...s, tileRadius: px }));
    this.persist();
  }
  setRandomEnabled(on) {
    this.state.update((s) => ({ ...s, randomEnabled: on }));
    this.persist();
    this.restartRotation();
    this.lastLiveSig = null;
    this.pushLive();
  }
  setRandomInterval(sec) {
    this.state.update((s) => ({ ...s, randomIntervalSec: sec }));
    this.persist();
    this.restartRotation();
    this.pushLive();
  }
  setRandomFavOnly(on) {
    this.state.update((s) => ({ ...s, randomFavOnly: on }));
    this.persist();
    this.pushLive();
  }
  setRandomSetHome(on) {
    this.state.update((s) => ({ ...s, randomSetHome: on }));
    this.persist();
  }
  setRandomSetLock(on) {
    this.state.update((s) => ({ ...s, randomSetLock: on }));
    this.persist();
  }
  setTransitionType(t) {
    this.state.update((s) => ({ ...s, transitionType: t }));
    this.persist();
    this.syncLiveTransition();
  }
  setTransitionMs(ms) {
    this.state.update((s) => ({ ...s, transitionMs: ms }));
    this.persist();
    this.syncLiveTransition();
  }
  setDeviceMobile(on) {
    this.state.update((s) => ({ ...s, deviceMobile: on }));
    this.persist();
  }
  setLiveWallpaper(on) {
    this.state.update((s) => ({ ...s, liveWallpaper: on }));
    this.persist();
    if (on) this.pushLive();
  }
  /** Open Android's live-wallpaper chooser so SKWD Wall becomes the active one. */
  openLivePicker() {
    void this.live?.openPicker();
  }
  setWallColumns(n) {
    this.state.update((s) => ({ ...s, wallColumns: n }));
    this.persist();
  }
  setSlicesSkew(deg) {
    this.state.update((s) => ({ ...s, slicesSkew: deg }));
    this.persist();
  }
  setSlicesHeight(n) {
    this.state.update((s) => ({ ...s, slicesHeight: n }));
    this.persist();
  }
  setHexSize(px) {
    this.state.update((s) => ({ ...s, hexSize: px }));
    this.persist();
  }
  setDepthTilt(deg) {
    this.state.update((s) => ({ ...s, depthTilt: deg }));
    this.persist();
  }
  setHandSpread(deg) {
    this.state.update((s) => ({ ...s, handSpread: deg }));
    this.persist();
  }
  // --- Collections / playlists ---
  createCollection(name) {
    const id = `col-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const col = { id, name: name.trim() || "Neue Sammlung", itemIds: [] };
    this.state.update((s) => ({ ...s, collections: [...s.collections, col] }));
    this.persist();
    return id;
  }
  renameCollection(id, name) {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.map((c) => c.id === id ? { ...c, name: name.trim() || c.name } : c)
    }));
    this.persist();
  }
  deleteCollection(id) {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.filter((c) => c.id !== id),
      activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId
    }));
    this.persist();
    this.restartRotation();
  }
  toggleInCollection(collectionId, itemId) {
    this.state.update((s) => ({
      ...s,
      collections: s.collections.map((c) => {
        if (c.id !== collectionId) return c;
        const has = c.itemIds.includes(itemId);
        return { ...c, itemIds: has ? c.itemIds.filter((x) => x !== itemId) : [...c.itemIds, itemId] };
      })
    }));
    this.persist();
  }
  setActiveCollection(id) {
    this.state.update((s) => ({ ...s, activeCollectionId: id }));
    this.persist();
    this.restartRotation();
    this.lastLiveSig = null;
    this.pushLive();
  }
  // --- Schedule rules ---
  setScheduleEnabled(on) {
    this.state.update((s) => ({ ...s, scheduleEnabled: on }));
    this.persist();
    this.restartScheduler();
  }
  addScheduleRule() {
    const id = `sch-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const rule = { id, time: "08:00", targetType: "random" };
    this.state.update((s) => ({ ...s, schedule: [...s.schedule, rule] }));
    this.persist();
    return id;
  }
  updateScheduleRule(id, patch) {
    this.state.update((s) => ({
      ...s,
      schedule: s.schedule.map((r) => r.id === id ? { ...r, ...patch } : r)
    }));
    this.persist();
    this.restartScheduler();
  }
  removeScheduleRule(id) {
    this.state.update((s) => ({ ...s, schedule: s.schedule.filter((r) => r.id !== id) }));
    this.persist();
  }
  toggleFavorite(id) {
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) => i.id === id ? { ...i, favorite: !i.favorite } : i)
    }));
    this.persist();
    if (this.state.get().randomFavOnly) {
      this.lastLiveSig = null;
      this.pushLive();
    }
  }
  renameItem(id, name) {
    this.state.update((s) => ({
      ...s,
      items: s.items.map((i) => i.id === id ? { ...i, name } : i)
    }));
    this.persist();
  }
  addTag(id, tag) {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    this.state.update((s) => ({
      ...s,
      items: s.items.map(
        (i) => i.id === id ? { ...i, tags: [.../* @__PURE__ */ new Set([...i.tags ?? [], t])] } : i
      )
    }));
    this.persist();
  }
  removeTag(id, tag) {
    this.state.update((s) => ({
      ...s,
      items: s.items.map(
        (i) => i.id === id ? { ...i, tags: (i.tags ?? []).filter((x) => x !== tag) } : i
      )
    }));
    this.persist();
  }
  setDim(dim) {
    this.state.update((s) => ({ ...s, dim }));
    this.persist();
    this.applyActive();
  }
}

// generated during release, do not modify

const PUBLIC_VERSION = '5';

if (typeof window !== 'undefined') {
	// @ts-expect-error
	((window.__svelte ??= {}).v ??= new Set()).add(PUBLIC_VERSION);
}

/* reactive.svelte.ts generated by Svelte v5.57.2 */

function useStore(store) {
	let state$1 = state(proxy(store.get()));

	user_effect(() => {
		const unsub = store.subscribe((v) => {
			set(state$1, v, true);
		});

		return unsub;
	});

	return {
		get value() {
			return get(state$1);
		}
	};
}

var root$5 = from_svg(`<path></path>`);
var root_1$5 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg>`);

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
	var svg = root_1$5();

	each(svg, 21, () => get(d).split(' M').map((p, i) => i === 0 ? p : 'M' + p), index, ($$anchor, segment) => {
		var path = root$5();

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

function colorFamily(hex) {
  if (!hex) return "mono";
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "mono";
  const n = parseInt(m[1], 16);
  const r = n >> 16 & 255;
  const g = n >> 8 & 255;
  const b = n & 255;
  const { h, s } = rgbToHsl(r, g, b);
  if (s < 0.15) return "mono";
  if (h < 15 || h >= 345) return "red";
  if (h < 40) return "orange";
  if (h < 70) return "yellow";
  if (h < 160) return "green";
  if (h < 195) return "teal";
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return "pink";
}
function lightness(hex) {
  if (!hex) return 0;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = n >> 16 & 255;
  const g = n >> 8 & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function rainbowKey(hex) {
  if (!hex) return 2e3;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 2e3;
  const n = parseInt(m[1], 16);
  const { h, s, l } = rgbToHsl(n >> 16 & 255, n >> 8 & 255, n & 255);
  if (s < 0.15) return 1e3 + l;
  return h >= 345 ? h - 360 : h;
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

var root$4 = from_html(`<div class="subhead svelte-eje18g"> </div>`);
var root_1$4 = from_html(`<span class="desc svelte-eje18g"> </span>`);
var root_2$4 = from_html(`<div class="field row svelte-eje18g"><div class="meta svelte-eje18g"><span class="label svelte-eje18g"> </span><!></div> <button type="button" role="switch"><span class="knob svelte-eje18g"></span></button></div>`);
var root_3$4 = from_html(`· <span class="inline-desc svelte-eje18g"> </span>`, 1);
var root_4$4 = from_html(`<div class="field svelte-eje18g"><span class="label svelte-eje18g"> <!> <span class="val svelte-eje18g"> </span></span> <div class="slider svelte-eje18g" role="slider" tabindex="0"><div class="slider-track svelte-eje18g"><div class="slider-fill svelte-eje18g"></div></div> <div class="slider-thumb svelte-eje18g"></div></div></div>`);
var root_5$4 = from_html(`<button> </button>`);
var root_6$4 = from_html(`<div class="field svelte-eje18g"><span class="label svelte-eje18g"> </span> <div class="seg wrap svelte-eje18g"></div></div>`);
var root_7$3 = from_html(`<option> </option>`);
var root_8$3 = from_html(`<div class="field row svelte-eje18g"><div class="meta svelte-eje18g"><span class="label svelte-eje18g"> </span><!></div> <select class="svelte-eje18g"></select></div>`);
var root_9$3 = from_html(`<div class="field svelte-eje18g"><span class="label svelte-eje18g"> </span> <!> <input class="text svelte-eje18g" type="text" spellcheck="false"/></div>`);
var root_10$3 = from_html(`<div class="field row svelte-eje18g"><span class="label svelte-eje18g"> </span> <input type="color" class="svelte-eje18g"/></div>`);
var root_11$3 = from_html(`<div class="field row svelte-eje18g"><div class="meta svelte-eje18g"><span class="label svelte-eje18g"> </span><!></div> <button class="action svelte-eje18g"> </button></div>`);
var root_12$3 = from_html(`<div class="cat-tabs svelte-eje18g"></div>`);
var root_13$3 = from_html(`<h3 class="svelte-eje18g"> </h3>`);
var root_14$3 = from_html(`<!> <!>`, 1);
var root_15$3 = from_html(`<div class="settings svelte-eje18g"><!> <!></div>`);

const $$css$4 = {
	hash: 'svelte-eje18g',
	code: '.settings.svelte-eje18g {display:flex;flex-direction:column;gap:var(--space-4);}.cat-tabs.svelte-eje18g {position:sticky;top:0;z-index:5;display:flex;gap:6px;flex-wrap:wrap;padding-bottom:var(--space-2);margin:calc(-1 * var(--space-2)) 0 0;background:linear-gradient(var(--bg-elevated, var(--bg)) 80%, transparent);}.cat-tab.svelte-eje18g {padding:6px 14px;background:var(--bg);border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:0.85rem;white-space:nowrap;}.cat-tab.on.svelte-eje18g {background:var(--color-primary);color:#fff;border-color:transparent;font-weight:600;}h3.svelte-eje18g {margin:var(--space-2) 0 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);}h3.svelte-eje18g:first-child {margin-top:0;}.subhead.svelte-eje18g {font-size:0.74rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-faint);margin-top:var(--space-1);}.field.svelte-eje18g {display:flex;flex-direction:column;gap:var(--space-2);}.field.row.svelte-eje18g {flex-direction:row;align-items:center;justify-content:space-between;gap:var(--space-3);}.meta.svelte-eje18g {display:flex;flex-direction:column;gap:2px;min-width:0;}.label.svelte-eje18g {font-size:0.9rem;color:var(--text-muted);}.desc.svelte-eje18g, .inline-desc.svelte-eje18g {font-size:0.78rem;color:var(--text-faint);line-height:1.4;}.val.svelte-eje18g {color:var(--text-faint);font-variant-numeric:tabular-nums;}\n  /* Custom slider: pan-y → vertical drags scroll the list; only horizontal\n     drags / deliberate taps move the value. Prevents accidental nudges. */.slider.svelte-eje18g {position:relative;width:100%;height:34px;display:flex;align-items:center;touch-action:pan-y;cursor:pointer;}.slider-track.svelte-eje18g {width:100%;height:6px;border-radius:999px;background:var(--bg-elevated);box-shadow:inset 0 0 0 1px var(--border);overflow:hidden;}.slider-fill.svelte-eje18g {height:100%;background:var(--color-primary);border-radius:999px;}.slider-thumb.svelte-eje18g {position:absolute;top:50%;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);transform:translate(-50%, -50%);pointer-events:none;}.seg.svelte-eje18g {display:flex;gap:4px;flex-wrap:wrap;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:3px;}.seg.svelte-eje18g button:where(.svelte-eje18g) {flex:1;padding:var(--space-2) var(--space-3);background:transparent;border:none;border-radius:var(--radius-sm);color:var(--text-muted);font-size:0.82rem;white-space:nowrap;}.seg.svelte-eje18g button.on:where(.svelte-eje18g) {background:var(--color-primary);color:#fff;}select.svelte-eje18g, .text.svelte-eje18g {padding:var(--space-2) var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;}select.svelte-eje18g {max-width:55%;}input[type=\'color\'].svelte-eje18g {width:44px;height:34px;padding:0;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-elevated);}.action.svelte-eje18g {padding:var(--space-2) var(--space-4);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;white-space:nowrap;}.toggle.svelte-eje18g {flex:0 0 auto;width:46px;height:28px;padding:0;border:none;border-radius:999px;background:var(--bg-elevated);box-shadow:inset 0 0 0 1px var(--border);transition:background 0.18s ease;}.toggle.on.svelte-eje18g {background:var(--color-primary);box-shadow:inset 0 0 0 1px transparent;}.knob.svelte-eje18g {display:block;width:22px;height:22px;margin:3px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);transform:translateX(0);transition:transform 0.18s cubic-bezier(0.4,0,0.2,1);}.toggle.on.svelte-eje18g .knob:where(.svelte-eje18g) {transform:translateX(18px);}'
};

function SettingsView($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$4);

	const /** Optional bespoke rows: map a def.customId to a snippet. */
	// Distinct categories (in order) among visible sections → tab bar.
	// Settle guard: ignore control activation for a moment after the panel opens,
	// so the tap that OPENED settings can't also flip the control beneath it.
	// Custom slider: only a horizontal drag (or a deliberate tap) changes the
	// value. Vertical drags fall through to the list scroll (touch-action: pan-y),
	// so you can't nudge a slider while scrolling the settings.
	// Do NOT change on down — wait to see if it's a horizontal drag or a tap.
	// pan-y only delivers horizontal moves here
	// deliberate tap commits
	// vertical scroll took over
	row = ($$anchor, def = noop) => {
		var fragment = comment();
		var node = first_child(fragment);

		{
			var consequent = ($$anchor) => {
				var div = root$4();
				var text = only_child(div, true);

				template_effect(() => set_text(text, def().label));
				append($$anchor, div);
			};

			var consequent_2 = ($$anchor) => {
				var fragment_1 = comment();
				var node_1 = first_child(fragment_1);

				{
					var consequent_1 = ($$anchor) => {
						var fragment_2 = comment();
						var node_2 = first_child(fragment_2);

						snippet(node_2, () => $$props.custom[def().customId]);
						append($$anchor, fragment_2);
					};

					if_block(node_1, ($$render) => {
						if (def().customId && $$props.custom?.[def().customId]) $$render(consequent_1);
					});
				}

				append($$anchor, fragment_1);
			};

			var consequent_4 = ($$anchor) => {
				var div_1 = root_2$4();
				var div_2 = child(div_1);
				var span = child(div_2);
				var text_1 = only_child(span, true);
				var node_3 = sibling(span);

				{
					var consequent_3 = ($$anchor) => {
						var span_1 = root_1$4();
						var text_2 = only_child(span_1, true);

						template_effect(() => set_text(text_2, def().desc));
						append($$anchor, span_1);
					};

					if_block(node_3, ($$render) => {
						if (def().desc) $$render(consequent_3);
					});
				}

				var button = sibling(div_2, 2);
				let classes;

				template_effect(
					($0, $1) => {
						set_text(text_1, def().label);
						classes = set_class(button, 1, 'toggle svelte-eje18g', null, classes, { on: $0 });
						set_attribute(button, 'aria-checked', $1);
						set_attribute(button, 'aria-label', def().label);
					},
					[
						() => !!$$props.schema.get(def().key),
						() => !!$$props.schema.get(def().key)
					]
				);

				delegated('click', button, () => get(armed) && $$props.schema.set(def().key, !$$props.schema.get(def().key)));
				append($$anchor, div_1);
			};

			var consequent_6 = ($$anchor) => {
				var div_3 = root_4$4();
				var span_2 = child(div_3);
				var text_3 = child(span_2);
				var node_4 = sibling(text_3);

				{
					var consequent_5 = ($$anchor) => {
						var fragment_3 = root_3$4();
						var span_3 = sibling(first_child(fragment_3));
						var text_4 = only_child(span_3, true);

						template_effect(() => set_text(text_4, def().desc));
						append($$anchor, fragment_3);
					};

					if_block(node_4, ($$render) => {
						if (def().desc) $$render(consequent_5);
					});
				}

				var span_4 = sibling(node_4, 2);
				var text_5 = only_child(span_4);

				var div_4 = sibling(span_2, 2);
				var div_5 = child(div_4);
				var div_6 = only_child(div_5);
				var div_7 = sibling(div_5, 2);

				template_effect(
					($0, $1, $2, $3) => {
						set_text(text_3, def().label);
						set_text(text_5, `${$0 ?? ''}${def().unit ?? '' ?? ''}`);
						set_attribute(div_4, 'aria-valuemin', def().min ?? 0);
						set_attribute(div_4, 'aria-valuemax', def().max ?? 100);
						set_attribute(div_4, 'aria-valuenow', $1);
						set_attribute(div_4, 'aria-label', def().label);
						set_style(div_6, `width:${$2 ?? ''}%`);
						set_style(div_7, `left:${$3 ?? ''}%`);
					},
					[
						() => $$props.schema.get(def().key),
						() => sliderValue(def()),
						() => sliderPct(def()),
						() => sliderPct(def())
					]
				);

				delegated('pointerdown', div_4, (e) => sliderDown(e, def()));
				delegated('pointermove', div_4, (e) => sliderMove(e, def()));
				delegated('pointerup', div_4, (e) => sliderUp(e, def()));
				event('pointercancel', div_4, () => sliderCancel(def()));
				append($$anchor, div_3);
			};

			var consequent_7 = ($$anchor) => {
				var div_8 = root_6$4();
				var span_5 = child(div_8);
				var text_6 = only_child(span_5, true);
				var div_9 = sibling(span_5, 2);

				each(div_9, 21, () => def().options ?? [], (o) => o.value, ($$anchor, o) => {
					var button_1 = root_5$4();
					let classes_1;
					var text_7 = only_child(button_1, true);

					template_effect(
						($0) => {
							classes_1 = set_class(button_1, 1, 'svelte-eje18g', null, classes_1, { on: $0 });
							set_text(text_7, get(o).label);
						},
						[() => $$props.schema.get(def().key) === get(o).value]
					);

					delegated('click', button_1, () => get(armed) && $$props.schema.set(def().key, get(o).value));
					append($$anchor, button_1);
				});
				template_effect(() => set_text(text_6, def().label));
				append($$anchor, div_8);
			};

			var consequent_9 = ($$anchor) => {
				var div_10 = root_8$3();
				var div_11 = child(div_10);
				var span_6 = child(div_11);
				var text_8 = only_child(span_6, true);
				var node_5 = sibling(span_6);

				{
					var consequent_8 = ($$anchor) => {
						var span_7 = root_1$4();
						var text_9 = only_child(span_7, true);

						template_effect(() => set_text(text_9, def().desc));
						append($$anchor, span_7);
					};

					if_block(node_5, ($$render) => {
						if (def().desc) $$render(consequent_8);
					});
				}

				var select = sibling(div_11, 2);

				each(select, 21, () => def().options ?? [], (o) => o.value, ($$anchor, o) => {
					var option = root_7$3();
					var text_10 = only_child(option, true);
					var option_value = {};

					template_effect(() => {
						set_text(text_10, get(o).label);

						if (option_value !== (option_value = get(o).value)) {
							option.value = (option.__value = option_value) ?? '';
						}
					});

					append($$anchor, option);
				});

				var select_value;

				init_select(select);

				template_effect(
					($0) => {
						set_text(text_8, def().label);

						if (select_value !== (select_value = $0)) {
							(
								select.value = (select.__value = select_value) ?? '',
								select_option(select, select_value)
							);
						}
					},
					[() => $$props.schema.get(def().key)]
				);

				delegated('change', select, (e) => get(armed) && $$props.schema.set(def().key, str(e)));
				append($$anchor, div_10);
			};

			var consequent_11 = ($$anchor) => {
				var div_12 = root_9$3();
				var span_8 = child(div_12);
				var text_11 = only_child(span_8, true);
				var node_6 = sibling(span_8, 2);

				{
					var consequent_10 = ($$anchor) => {
						var span_9 = root_1$4();
						var text_12 = only_child(span_9, true);

						template_effect(() => set_text(text_12, def().desc));
						append($$anchor, span_9);
					};

					if_block(node_6, ($$render) => {
						if (def().desc) $$render(consequent_10);
					});
				}

				var input = sibling(node_6, 2);

				template_effect(
					($0) => {
						set_text(text_11, def().label);
						set_attribute(input, 'placeholder', def().placeholder ?? '');
						set_value(input, $0);
					},
					[() => $$props.schema.get(def().key) ?? '']
				);

				delegated('input', input, (e) => $$props.schema.set(def().key, str(e)));
				append($$anchor, div_12);
			};

			var consequent_12 = ($$anchor) => {
				var div_13 = root_10$3();
				var span_10 = child(div_13);
				var text_13 = only_child(span_10, true);
				var input_1 = sibling(span_10, 2);

				template_effect(
					($0) => {
						set_text(text_13, def().label);
						set_value(input_1, $0);
					},
					[() => $$props.schema.get(def().key) ?? '#000000']
				);

				delegated('input', input_1, (e) => $$props.schema.set(def().key, str(e)));
				append($$anchor, div_13);
			};

			var consequent_14 = ($$anchor) => {
				var div_14 = root_11$3();
				var div_15 = child(div_14);
				var span_11 = child(div_15);
				var text_14 = only_child(span_11, true);
				var node_7 = sibling(span_11);

				{
					var consequent_13 = ($$anchor) => {
						var span_12 = root_1$4();
						var text_15 = only_child(span_12, true);

						template_effect(() => set_text(text_15, def().desc));
						append($$anchor, span_12);
					};

					if_block(node_7, ($$render) => {
						if (def().desc) $$render(consequent_13);
					});
				}

				var button_2 = sibling(div_15, 2);
				var text_16 = only_child(button_2, true);

				template_effect(() => {
					set_text(text_14, def().label);
					set_text(text_16, def().buttonLabel ?? 'OK');
				});

				delegated('click', button_2, () => get(armed) && def().onClick?.());
				append($$anchor, div_14);
			};

			if_block(node, ($$render) => {
				if (def().type === 'heading') $$render(consequent); else if (def().type === 'custom') $$render(consequent_2, 1); else if (def().type === 'toggle') $$render(consequent_4, 2); else if (def().type === 'slider') $$render(consequent_6, 3); else if (def().type === 'segment') $$render(consequent_7, 4); else if (def().type === 'select') $$render(consequent_9, 5); else if (def().type === 'text') $$render(consequent_11, 6); else if (def().type === 'color') $$render(consequent_12, 7); else if (def().type === 'button') $$render(consequent_14, 8);
			});
		}

		append($$anchor, fragment);
	};

	function visible(show) {
		return show ? !!show() : true;
	}

	// Distinct categories (in order) among visible sections → tab bar.
	let cats = user_derived(() => {
		const seen = [];

		for (const s of $$props.schema.sections) {
			if (s.category && visible(s.show) && !seen.includes(s.category)) seen.push(s.category);
		}

		return seen;
	});

	let activeCat = state('');

	user_effect(() => {
		if (get(cats).length && !get(cats).includes(get(activeCat))) set(activeCat, get(cats)[0], true);
	});

	function sectionVisible(sec) {
		if (!visible(sec.show)) return false;

		return get(cats).length === 0 || sec.category === get(activeCat);
	}

	function str(e) {
		return e.target.value;
	}

	// Settle guard: ignore control activation for a moment after the panel opens,
	// so the tap that OPENED settings can't also flip the control beneath it.
	let armed = state(false);

	user_effect(() => {
		const t = setTimeout(() => set(armed, true), 320);

		return () => clearTimeout(t);
	});

	// Custom slider: only a horizontal drag (or a deliberate tap) changes the
	// value. Vertical drags fall through to the list scroll (touch-action: pan-y),
	// so you can't nudge a slider while scrolling the settings.
	let sliding = null;

	function sliderValue(def) {
		return $$props.schema.get(def.key) ?? (def.min ?? 0);
	}

	function sliderPct(def) {
		const min = def.min ?? 0;
		const max = def.max ?? 100;

		return max === min
			? 0
			: Math.max(0, Math.min(100, (sliderValue(def) - min) / (max - min) * 100));
	}

	function applySlider(def, clientX, el) {
		const rect = el.getBoundingClientRect();

		const t = rect.width
			? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
			: 0;

		const min = def.min ?? 0;
		const max = def.max ?? 100;
		const step = def.step ?? 1;
		let v = min + t * (max - min);

		v = Math.round(v / step) * step;
		v = Math.max(min, Math.min(max, v));
		$$props.schema.set(def.key, v);
	}

	function sliderDown(e, def) {
		if (!get(armed)) return;

		sliding = def.key;

		// Do NOT change on down — wait to see if it's a horizontal drag or a tap.
	}

	function sliderMove(e, def) {
		if (sliding !== def.key) return; // pan-y only delivers horizontal moves here

		const el = e.currentTarget;

		el.setPointerCapture?.(e.pointerId);
		applySlider(def, e.clientX, el);
	}

	function sliderUp(e, def) {
		if (sliding !== def.key) return;

		sliding = null;
		applySlider(def, e.clientX, e.currentTarget); // deliberate tap commits
	}

	function sliderCancel(def) {
		if (sliding === def.key) sliding = null; // vertical scroll took over
	}

	var div_16 = root_15$3();
	var node_8 = child(div_16);

	{
		var consequent_15 = ($$anchor) => {
			var div_17 = root_12$3();

			each(div_17, 20, () => get(cats), (c) => c, ($$anchor, c) => {
				var button_3 = root_5$4();
				let classes_2;
				var text_17 = only_child(button_3, true);

				template_effect(() => {
					classes_2 = set_class(button_3, 1, 'cat-tab svelte-eje18g', null, classes_2, { on: get(activeCat) === c });
					set_text(text_17, c);
				});

				delegated('click', button_3, () => set(activeCat, c, true));
				append($$anchor, button_3);
			});
			append($$anchor, div_17);
		};

		if_block(node_8, ($$render) => {
			if (get(cats).length > 1) $$render(consequent_15);
		});
	}

	var node_9 = sibling(node_8, 2);

	each(node_9, 17, () => $$props.schema.sections, (section) => section.title ?? section.defs, ($$anchor, section) => {
		var fragment_4 = comment();
		var node_10 = first_child(fragment_4);

		{
			var consequent_18 = ($$anchor) => {
				var fragment_5 = root_14$3();
				var node_11 = first_child(fragment_5);

				{
					var consequent_16 = ($$anchor) => {
						var h3 = root_13$3();
						var text_18 = only_child(h3, true);

						template_effect(() => set_text(text_18, get(section).title));
						append($$anchor, h3);
					};

					if_block(node_11, ($$render) => {
						if (get(section).title) $$render(consequent_16);
					});
				}

				var node_12 = sibling(node_11, 2);

				each(node_12, 17, () => get(section).defs, (def) => def.key ?? def.label ?? def.customId, ($$anchor, def) => {
					var fragment_6 = comment();
					var node_13 = first_child(fragment_6);

					{
						var consequent_17 = ($$anchor) => {
							row($$anchor, () => get(def));
						};

						var d = user_derived(() => visible(get(def).show));

						if_block(node_13, ($$render) => {
							if (get(d)) $$render(consequent_17);
						});
					}

					append($$anchor, fragment_6);
				});

				append($$anchor, fragment_5);
			};

			var d_1 = user_derived(() => sectionVisible(get(section)));

			if_block(node_10, ($$render) => {
				if (get(d_1)) $$render(consequent_18);
			});
		}

		append($$anchor, fragment_4);
	});
	append($$anchor, div_16);
	pop();
}

delegate([
	'click',
	'pointerdown',
	'pointermove',
	'pointerup',
	'change',
	'input'
]);

var root$3 = from_html(`<button></button>`);
var root_1$3 = from_html(`<button> </button>`);
var root_2$3 = from_html(`<div class="ip-tags svelte-o97s3m"></div>`);
var root_3$3 = from_html(`<div class="ip-empty svelte-o97s3m">Kein Bild passt zu den Filtern.</div>`);
var root_4$3 = from_html(`<button class="ip-tile svelte-o97s3m"><span class="ip-name svelte-o97s3m"> </span></button>`);
var root_5$3 = from_html(`<div class="ip-grid svelte-o97s3m"></div>`);
var root_6$3 = from_html(`<div class="ip-overlay svelte-o97s3m" role="presentation"><div class="ip-sheet svelte-o97s3m" role="dialog" tabindex="-1"><div class="ip-head svelte-o97s3m"><span> </span> <button class="ip-close svelte-o97s3m" aria-label="Schließen">×</button></div> <input class="ip-search svelte-o97s3m" placeholder="Name oder Tag…" spellcheck="false"/> <div class="ip-filters svelte-o97s3m"><button>★ Favoriten</button> <!></div> <!> <!></div></div>`);

const $$css$3 = {
	hash: 'svelte-o97s3m',
	code: '.ip-overlay.svelte-o97s3m {position:fixed;inset:0;z-index:80;background:rgba(0, 0, 0, 0.55);display:flex;align-items:center;justify-content:center;padding:var(--space-4);}.ip-sheet.svelte-o97s3m {width:min(560px, 96%);max-height:88%;overflow-y:auto;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);}.ip-head.svelte-o97s3m {display:flex;align-items:center;justify-content:space-between;font-weight:600;}.ip-close.svelte-o97s3m {background:transparent;border:none;color:var(--text-muted);font-size:1.3rem;line-height:1;}.ip-search.svelte-o97s3m {padding:var(--space-3);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.95rem;outline:none;}.ip-filters.svelte-o97s3m {display:flex;flex-wrap:wrap;align-items:center;gap:6px;}.ip-tags.svelte-o97s3m {display:flex;flex-wrap:wrap;gap:6px;}.ip-chip.svelte-o97s3m {padding:5px 12px;background:var(--bg);border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:0.82rem;white-space:nowrap;}.ip-chip.sm.svelte-o97s3m {padding:4px 10px;font-size:0.78rem;}.ip-chip.on.svelte-o97s3m {background:var(--color-primary);color:#fff;border-color:transparent;}.ip-swatch.svelte-o97s3m {width:24px;height:24px;border-radius:50%;border:2px solid transparent;background:var(--sw);padding:0;}.ip-swatch.on.svelte-o97s3m {border-color:var(--text);box-shadow:0 0 0 2px var(--color-primary);}.ip-grid.svelte-o97s3m {display:grid;grid-template-columns:repeat(auto-fill, minmax(96px, 1fr));gap:8px;}.ip-tile.svelte-o97s3m {position:relative;aspect-ratio:3 / 4;border:1px solid var(--border);border-radius:var(--radius-md);background-size:cover;background-position:center;background-color:var(--color-surface-variant);overflow:hidden;padding:0;cursor:pointer;}.ip-name.svelte-o97s3m {position:absolute;left:0;right:0;bottom:0;padding:12px 6px 5px;font-size:0.68rem;color:#fff;text-align:left;background:linear-gradient(transparent, rgba(0, 0, 0, 0.7));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ip-empty.svelte-o97s3m {padding:var(--space-5);text-align:center;color:var(--text-muted);font-size:0.9rem;}'
};

function ImagePicker($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$3);

	let title = prop($$props, 'title', 3, 'Bild wählen');
	const wpState = useStore($$props.manager.state);
	const urls = useStore($$props.manager.urls);
	let search = state('');
	let favOnly = state(false);
	let colorKey = state(null);
	let selectedTags = state(proxy([]));
	let allItems = user_derived(() => wpState.value.items);

	let allTags = user_derived(() => {
		const set = new Set();

		for (const it of get(allItems)) for (const t of it.tags ?? []) set.add(t);

		return [...set].sort();
	});

	function toggleTag(t) {
		set(
			selectedTags,
			get(selectedTags).includes(t)
				? get(selectedTags).filter((x) => x !== t)
				: [...get(selectedTags), t],
			true
		);
	}

	let items = user_derived(() => {
		const q = get(search).trim().toLowerCase();

		return get(allItems).filter((it) => {
			if (get(favOnly) && !it.favorite) return false;
			if (get(colorKey) && colorFamily(it.accent) !== get(colorKey)) return false;
			if (get(selectedTags).length && !get(selectedTags).every((t) => (it.tags ?? []).includes(t))) return false;
			if (q && !it.name.toLowerCase().includes(q) && !(it.tags ?? []).some((t) => t.includes(q))) return false;

			return true;
		});
	});

	function bg(id) {
		const u = urls.value[id];

		return u ? `background-image:url(${u})` : '';
	}

	var div = root_6$3();
	var div_1 = child(div);
	var div_2 = child(div_1);
	var span = child(div_2);
	var text = only_child(span, true);
	var button = sibling(span, 2);

	var input = sibling(div_2, 2);

	var div_3 = sibling(input, 2);
	var button_1 = child(div_3);
	let classes;
	var node = sibling(button_1, 2);

	each(node, 17, () => COLOR_FAMILIES, (c) => c.key, ($$anchor, c) => {
		var button_2 = root$3();
		let classes_1;

		template_effect(() => {
			classes_1 = set_class(button_2, 1, 'ip-swatch svelte-o97s3m', null, classes_1, { on: get(colorKey) === get(c).key });
			set_style(button_2, `--sw:${get(c).swatch ?? ''}`);
			set_attribute(button_2, 'title', get(c).label);
			set_attribute(button_2, 'aria-label', get(c).label);
		});

		delegated('click', button_2, () => set(colorKey, get(colorKey) === get(c).key ? null : get(c).key, true));
		append($$anchor, button_2);
	});

	var node_1 = sibling(div_3, 2);

	{
		var consequent = ($$anchor) => {
			var div_4 = root_2$3();

			each(div_4, 20, () => get(allTags), (t) => t, ($$anchor, t) => {
				var button_3 = root_1$3();
				let classes_2;
				var text_1 = only_child(button_3, true);

				template_effect(
					($0) => {
						classes_2 = set_class(button_3, 1, 'ip-chip sm svelte-o97s3m', null, classes_2, { on: $0 });
						set_text(text_1, t);
					},
					[() => get(selectedTags).includes(t)]
				);

				delegated('click', button_3, () => toggleTag(t));
				append($$anchor, button_3);
			});
			append($$anchor, div_4);
		};

		if_block(node_1, ($$render) => {
			if (get(allTags).length) $$render(consequent);
		});
	}

	var node_2 = sibling(node_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var div_5 = root_3$3();

			append($$anchor, div_5);
		};

		var alternate = ($$anchor) => {
			var div_6 = root_5$3();

			each(div_6, 21, () => get(items), (it) => it.id, ($$anchor, it) => {
				var button_4 = root_4$3();
				var span_1 = child(button_4);
				var text_2 = only_child(span_1, true);

				template_effect(
					($0) => {
						set_style(button_4, $0);
						set_attribute(button_4, 'title', get(it).name);
						set_text(text_2, get(it).name);
					},
					[() => bg(get(it).id)]
				);

				delegated('click', button_4, () => $$props.onpick(get(it).id));
				append($$anchor, button_4);
			});
			append($$anchor, div_6);
		};

		if_block(node_2, ($$render) => {
			if (get(items).length === 0) $$render(consequent_1); else $$render(alternate, -1);
		});
	}

	template_effect(() => {
		set_attribute(div_1, 'aria-label', title());
		set_text(text, title());
		classes = set_class(button_1, 1, 'ip-chip svelte-o97s3m', null, classes, { on: get(favOnly) });
	});

	delegated('click', div, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	delegated('click', div_1, (e) => e.stopPropagation());

	delegated('click', button, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	bind_value(input, () => get(search), ($$value) => set(search, $$value));
	delegated('click', button_1, () => set(favOnly, !get(favOnly)));
	append($$anchor, div);
	pop();
}

delegate(['click']);

const aiNote = ($$anchor) => {
	var p_5 = root_22$2();

	append($$anchor, p_5);
};

const pathsNote = ($$anchor) => {
	var p_6 = root_23$2();

	append($$anchor, p_6);
};

var root$2 = from_html(`<p class="hint ok svelte-j0aff2">✓ „SKWD Wall" ist als Live-Wallpaper aktiv.</p>`);
var root_1$2 = from_html(`<p class="hint warn svelte-j0aff2">⚠ Nicht aktiv (Neuinstallation setzt das zurück). Unten neu auswählen.</p>`);
var root_2$2 = from_html(`<!> <button class="btn primary svelte-j0aff2">Als Handy-Hintergrund aktivieren…</button>`, 1);
var root_3$2 = from_html(`<button class="preset-x svelte-j0aff2" aria-label="Preset löschen">×</button>`);
var root_4$2 = from_html(`<span class="preset svelte-j0aff2"><button> </button> <!></span>`);
var root_5$2 = from_html(`<div class="chips svelte-j0aff2"><!> <span class="hint svelte-j0aff2">Leeres C = aktuelle Geometrie speichern · gefülltes = anwenden · × löscht.</span></div>`);
var root_6$2 = from_html(`<span class="preset svelte-j0aff2"><button class="preset-apply svelte-j0aff2"> </button> <button class="preset-x svelte-j0aff2" aria-label="Preset löschen">×</button></span>`);
var root_7$2 = from_html(`<div class="chips svelte-j0aff2"></div>`);
var root_8$2 = from_html(`<textarea class="ta svelte-j0aff2" readonly="" rows="3"></textarea>`);
var root_9$2 = from_html(`<p class="hint svelte-j0aff2"> </p>`);
var root_10$2 = from_html(`<textarea class="ta svelte-j0aff2" rows="3" placeholder="Presets-JSON einfügen…"></textarea> <button class="btn svelte-j0aff2">Import bestätigen</button> <!>`, 1);
var root_11$2 = from_html(`<!> <div class="row-inputs svelte-j0aff2"><input class="ti svelte-j0aff2" placeholder="Theme speichern als…" spellcheck="false"/> <button class="btn svelte-j0aff2">Speichern</button></div> <div class="row-inputs svelte-j0aff2"><button class="btn svelte-j0aff2">Exportieren</button> <button class="btn svelte-j0aff2">Importieren</button></div> <!> <!>`, 1);
var root_12$2 = from_html(`<div class="chips svelte-j0aff2"><button>🏠 Startbildschirm</button> <button>🔒 Sperrbildschirm</button></div>`);
var root_13$2 = from_html(`<option> </option>`);
var root_14$2 = from_html(`<select class="svelte-j0aff2"><option disabled="">Sammlung…</option><!></select>`);
var root_15$2 = from_html(`<span class="thumb svelte-j0aff2"></span> `, 1);
var root_16$2 = from_html(`<button class="sched-pick svelte-j0aff2"><!></button>`);
var root_17$2 = from_html(`<div class="sched svelte-j0aff2"><input type="time" class="svelte-j0aff2"/> <select class="svelte-j0aff2"><option>🎲 Zufällig</option><option>📁 Sammlung</option><option>🖼 Bild</option></select> <!> <button class="sched-x svelte-j0aff2" aria-label="Regel löschen">×</button></div>`);
var root_18$2 = from_html(`<!> <button class="btn svelte-j0aff2">＋ Regel hinzufügen</button>`, 1);
var root_19$2 = from_html(`<p class="hint svelte-j0aff2">Papierkorb ist leer.</p>`);
var root_20$2 = from_html(`<div class="trash-item svelte-j0aff2"><span class="thumb big svelte-j0aff2"></span> <span class="tn svelte-j0aff2"> </span> <div class="trash-actions svelte-j0aff2"><button class="btn sm svelte-j0aff2">Wiederherstellen</button> <button class="btn sm danger svelte-j0aff2">Löschen</button></div></div>`);
var root_21$2 = from_html(`<div class="trash-grid svelte-j0aff2"></div> <button class="btn danger svelte-j0aff2">Papierkorb leeren</button>`, 1);
var root_22$2 = from_html(`<p class="hint svelte-j0aff2">Nur die Verbindung — das eigentliche KI-Tagging (für Anime am besten ein WD14-/DeepDanbooru-Tagger) kommt als eigener Block.</p>`);
var root_23$2 = from_html(`<p class="hint svelte-j0aff2">Leer = App-Speicher (Standard). Native Gerät-Pfade (Android-Ordner direkt beschreiben) kommen als nativer Block; die Pfade werden schon gemerkt.</p>`);
var root_24$2 = from_html(`<p class="hint ok svelte-j0aff2"> </p>`);
var root_25$2 = from_html(`<button class="btn svelte-j0aff2">Verbinden</button>`);
var root_26$2 = from_html(`<div class="folder-row svelte-j0aff2"><div class="folder-meta svelte-j0aff2"><span class="folder-name svelte-j0aff2"> </span> <span class="folder-sub svelte-j0aff2"> <!></span></div> <!> <button class="btn danger svelte-j0aff2">Entfernen</button></div>`);
var root_27$2 = from_html(`<p class="hint warn svelte-j0aff2">Nach einem Neustart muss der Ordner-Zugriff einmal neu bestätigt werden („Verbinden").</p>`);
var root_28$2 = from_html(`<div class="folder-list svelte-j0aff2"></div> <!>`, 1);
var root_29$2 = from_html(`<p class="hint svelte-j0aff2">Zeig auf einen echten Ordner — die Bilder/Videos erscheinen in der Galerie, <strong>ohne hochzuladen</strong> (Dateien bleiben im Ordner).</p> <div class="chips svelte-j0aff2"><button class="btn svelte-j0aff2">＋ Bilder-Ordner</button> <button class="btn svelte-j0aff2">＋ Video-Ordner</button></div> <!> <!>`, 1);
var root_30$2 = from_html(`<p class="hint svelte-j0aff2">Direkter Ordner-Zugriff geht in diesem Browser nicht. Am PC (Chrome/Edge) kannst du Ordner direkt einbinden; auf dem Handy kommt der native Ordner-Zugriff (SAF) als eigener Block. Bis dahin: <strong>Hochladen</strong> nutzen.</p>`);
var root_31$1 = from_html(`<!>     <!>`, 1);

const $$css$2 = {
	hash: 'svelte-j0aff2',
	code: '.hint.svelte-j0aff2 {margin:0;font-size:0.78rem;color:var(--text-faint);line-height:1.4;}.ok.svelte-j0aff2 {color:#46a758;}.warn.svelte-j0aff2 {color:#f5a524;}.chips.svelte-j0aff2 {display:flex;gap:6px;flex-wrap:wrap;align-items:center;}.chip.svelte-j0aff2 {padding:var(--space-2) var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-muted);font-size:0.82rem;}.chip.on.svelte-j0aff2 {background:var(--color-primary);color:#fff;border-color:transparent;}.preset.svelte-j0aff2 {display:inline-flex;align-items:stretch;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}.preset-apply.svelte-j0aff2 {padding:var(--space-2) var(--space-3);background:var(--bg-elevated);border:none;color:var(--text);font-size:0.82rem;}.preset-apply.empty.svelte-j0aff2 {color:var(--text-faint);border-style:dashed;}.preset-x.svelte-j0aff2 {padding:0 8px;background:var(--bg-elevated);border:none;border-left:1px solid var(--border);color:var(--text-muted);}.btn.svelte-j0aff2 {padding:var(--space-2) var(--space-4);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;white-space:nowrap;}.btn.primary.svelte-j0aff2 {background:var(--color-primary);border:none;color:#fff;font-weight:600;align-self:flex-start;}.btn.sm.svelte-j0aff2 {padding:4px 8px;font-size:0.78rem;}.btn.danger.svelte-j0aff2 {color:#e5484d;}.btn.svelte-j0aff2:disabled {opacity:0.5;}.folder-list.svelte-j0aff2 {display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2);}.folder-row.svelte-j0aff2 {display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);}.folder-meta.svelte-j0aff2 {display:flex;flex-direction:column;min-width:0;flex:1;}.folder-name.svelte-j0aff2 {font-size:0.88rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.folder-sub.svelte-j0aff2 {font-size:0.74rem;color:var(--text-faint);}.row-inputs.svelte-j0aff2 {display:flex;gap:var(--space-2);}.ti.svelte-j0aff2 {flex:1;min-width:0;padding:var(--space-2) var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;}.ta.svelte-j0aff2 {width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-family:var(--font-mono);font-size:0.75rem;padding:var(--space-2);resize:vertical;}.sched.svelte-j0aff2 {display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;}.sched.svelte-j0aff2 input[type=\'time\']:where(.svelte-j0aff2), .sched.svelte-j0aff2 select:where(.svelte-j0aff2) {padding:var(--space-2);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;}.sched-pick.svelte-j0aff2 {flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:5px var(--space-2);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;text-align:left;}.sched-x.svelte-j0aff2 {width:30px;height:30px;border-radius:var(--radius-md);background:transparent;border:1px solid var(--border);color:var(--text-muted);}.thumb.svelte-j0aff2 {flex:0 0 auto;width:26px;height:26px;border-radius:var(--radius-sm);background-size:cover;background-position:center;background-color:var(--color-surface-variant);}.trash-grid.svelte-j0aff2 {display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:var(--space-3);}.trash-item.svelte-j0aff2 {display:flex;flex-direction:column;gap:4px;}.thumb.big.svelte-j0aff2 {width:100%;height:80px;border-radius:var(--radius-md);}.tn.svelte-j0aff2 {font-size:0.75rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.trash-actions.svelte-j0aff2 {display:flex;gap:4px;}'
};

function WallpaperSettings($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$2);

	const // Native wallpaper/live-wallpaper capabilities are registered together on the
	// native app, so this flag gates every OS-level device feature below.
	// Live-wallpaper active status (reinstalling the APK resets it).
	// Schedule image picker.
	// Theme-preset UI state.
	// Folder sources.
	// Declarative sections. `show` closures read `s`/`vm` → reactive in SettingsView.
	// Geräte (native only)
	// Ansicht
	// per-mode geometry
	// Erscheinungsbild
	// Wallpaper
	// Video
	// Kacheln
	// Übergang
	// Automatischer Wechsel
	// Zeitplan
	// Verhalten
	// Wallhaven
	// KI (nur Anschluss — Tagging-Backend folgt)
	// Speicherort / Pfade
	// Menü
	// Papierkorb
	// Hilfe
	// Re-open the view so onOpen() shows the intro again.
	live = ($$anchor) => {
		var fragment = root_2$2();
		var node = first_child(fragment);

		{
			var consequent = ($$anchor) => {
				var p_1 = root$2();

				append($$anchor, p_1);
			};

			var consequent_1 = ($$anchor) => {
				var p_2 = root_1$2();

				append($$anchor, p_2);
			};

			if_block(node, ($$render) => {
				if (get(liveActive) === true) $$render(consequent); else if (get(liveActive) === false) $$render(consequent_1, 1);
			});
		}

		var button = sibling(node, 2);

		delegated('click', button, () => $$props.app.capabilities.get('live-wallpaper')?.openPicker());
		append($$anchor, fragment);
	};

	const presets = ($$anchor) => {
		var div = root_5$2();
		var node_1 = child(div);

		each(node_1, 16, () => [0, 1, 2, 3], (i) => i, ($$anchor, i) => {
			var span = root_4$2();
			var button_1 = child(span);
			let classes;
			var text = only_child(button_1);
			var node_2 = sibling(button_1, 2);

			{
				var consequent_2 = ($$anchor) => {
					var button_2 = root_3$2();

					delegated('click', button_2, () => $$props.manager.clearGeometryPreset(i));
					append($$anchor, button_2);
				};

				if_block(node_2, ($$render) => {
					if (get(s).geometryPresets[i]) $$render(consequent_2);
				});
			}

			template_effect(() => {
				classes = set_class(button_1, 1, 'preset-apply svelte-j0aff2', null, classes, { empty: !get(s).geometryPresets[i] });
				set_text(text, `C${i + 1}`);
			});

			delegated('click', button_1, () => get(s).geometryPresets[i]
				? $$props.manager.applyGeometryPreset(i)
				: $$props.manager.saveGeometryPreset(i));

			append($$anchor, span);
		});
		append($$anchor, div);
	};

	const themePresets = ($$anchor) => {
		var fragment_1 = root_11$2();
		var node_3 = first_child(fragment_1);

		{
			var consequent_3 = ($$anchor) => {
				var div_1 = root_7$2();

				each(div_1, 21, () => get(s).themePresets, (p) => p.id, ($$anchor, p) => {
					var span_1 = root_6$2();
					var button_3 = child(span_1);
					var text_1 = only_child(button_3, true);
					var button_4 = sibling(button_3, 2);
					template_effect(() => set_text(text_1, get(p).name));
					delegated('click', button_3, () => $$props.manager.applyThemePreset(get(p).id));
					delegated('click', button_4, () => $$props.manager.deleteThemePreset(get(p).id));
					append($$anchor, span_1);
				});
				append($$anchor, div_1);
			};

			if_block(node_3, ($$render) => {
				if (get(s).themePresets.length) $$render(consequent_3);
			});
		}

		var div_2 = sibling(node_3, 2);
		var input = child(div_2);

		var button_5 = sibling(input, 2);

		var div_3 = sibling(div_2, 2);
		var button_6 = child(div_3);
		var button_7 = sibling(button_6, 2);

		var node_4 = sibling(div_3, 2);

		{
			var consequent_4 = ($$anchor) => {
				var textarea = root_8$2();
				template_effect(() => set_value(textarea, get(exportText)));
				append($$anchor, textarea);
			};

			if_block(node_4, ($$render) => {
				if (get(exportText)) $$render(consequent_4);
			});
		}

		var node_5 = sibling(node_4, 2);

		{
			var consequent_6 = ($$anchor) => {
				var fragment_2 = root_10$2();
				var textarea_1 = first_child(fragment_2);

				var button_8 = sibling(textarea_1, 2);
				var node_6 = sibling(button_8, 2);

				{
					var consequent_5 = ($$anchor) => {
						var p_3 = root_9$2();
						var text_2 = only_child(p_3, true);

						template_effect(() => set_text(text_2, get(importMsg)));
						append($$anchor, p_3);
					};

					if_block(node_6, ($$render) => {
						if (get(importMsg)) $$render(consequent_5);
					});
				}

				bind_value(textarea_1, () => get(importText), ($$value) => set(importText, $$value));
				delegated('click', button_8, doImport);
				append($$anchor, fragment_2);
			};

			if_block(node_5, ($$render) => {
				if (get(importOpen)) $$render(consequent_6);
			});
		}

		delegated('keydown', input, (e) => {
			if (e.key === 'Enter' && get(presetName).trim()) {
				$$props.manager.saveThemePreset(get(presetName).trim());
				set(presetName, '');
			}
		});

		bind_value(input, () => get(presetName), ($$value) => set(presetName, $$value));

		delegated('click', button_5, () => {
			if (get(presetName).trim()) {
				$$props.manager.saveThemePreset(get(presetName).trim());
				set(presetName, '');
			}
		});

		delegated('click', button_6, doExport);
		delegated('click', button_7, () => set(importOpen, !get(importOpen)));
		append($$anchor, fragment_1);
	};

	const osTargets = ($$anchor) => {
		var div_4 = root_12$2();
		var button_9 = child(div_4);
		let classes_1;
		var button_10 = sibling(button_9, 2);
		let classes_2;

		template_effect(() => {
			classes_1 = set_class(button_9, 1, 'chip svelte-j0aff2', null, classes_1, { on: get(s).randomSetHome });
			classes_2 = set_class(button_10, 1, 'chip svelte-j0aff2', null, classes_2, { on: get(s).randomSetLock });
		});

		delegated('click', button_9, () => $$props.manager.setField('randomSetHome', !get(s).randomSetHome));
		delegated('click', button_10, () => $$props.manager.setField('randomSetLock', !get(s).randomSetLock));
		append($$anchor, div_4);
	};

	const schedule = ($$anchor) => {
		var fragment_3 = root_18$2();
		var node_7 = first_child(fragment_3);

		each(node_7, 17, () => get(s).schedule, (rule) => rule.id, ($$anchor, rule) => {
			const img = user_derived(() => get(s).items.find((i) => i.id === get(rule).targetId));
			var div_5 = root_17$2();
			var input_1 = child(div_5);

			var select = sibling(input_1, 2);
			var option = child(select);

			option.value = option.__value = 'random';

			var option_1 = sibling(option);

			option_1.value = option_1.__value = 'collection';

			var option_2 = sibling(option_1);

			option_2.value = option_2.__value = 'item';

			var node_8 = sibling(select, 2);

			{
				var consequent_7 = ($$anchor) => {
					var select_1 = root_14$2();
					var option_3 = child(select_1);

					option_3.value = option_3.__value = '';

					var node_9 = sibling(option_3);

					each(node_9, 17, () => get(s).collections, (c) => c.id, ($$anchor, c) => {
						var option_4 = root_13$2();
						var text_3 = only_child(option_4, true);
						var option_4_value = {};

						template_effect(() => {
							set_selected(option_4, get(rule).targetId === get(c).id);
							set_text(text_3, get(c).name);

							if (option_4_value !== (option_4_value = get(c).id)) {
								option_4.value = (option_4.__value = option_4_value) ?? '';
							}
						});

						append($$anchor, option_4);
					});
					template_effect(() => set_selected(option_3, !get(rule).targetId));
					delegated('change', select_1, (e) => $$props.manager.updateScheduleRule(get(rule).id, { targetId: e.target.value }));
					append($$anchor, select_1);
				};

				var consequent_9 = ($$anchor) => {
					var button_11 = root_16$2();
					var node_10 = child(button_11);

					{
						var consequent_8 = ($$anchor) => {
							var fragment_4 = root_15$2();
							var span_2 = first_child(fragment_4);
							var text_4 = sibling(span_2, 1, true);

							template_effect(() => {
								set_style(span_2, urls.value[get(img).id]
									? `background-image:url(${urls.value[get(img).id]})`
									: '');

								set_text(text_4, get(img).name);
							});

							append($$anchor, fragment_4);
						};

						var alternate = ($$anchor) => {
							var text_5 = text('🖼 Bild wählen');

							append($$anchor, text_5);
						};

						if_block(node_10, ($$render) => {
							if (get(img)) $$render(consequent_8); else $$render(alternate, -1);
						});
					}
					delegated('click', button_11, () => set(pickerRuleId, get(rule).id, true));
					append($$anchor, button_11);
				};

				if_block(node_8, ($$render) => {
					if (get(rule).targetType === 'collection') $$render(consequent_7); else if (get(rule).targetType === 'item') $$render(consequent_9, 1);
				});
			}

			var button_12 = sibling(node_8, 2);

			template_effect(() => {
				set_value(input_1, get(rule).time);
				set_selected(option, get(rule).targetType === 'random');
				set_selected(option_1, get(rule).targetType === 'collection');
				set_selected(option_2, get(rule).targetType === 'item');
			});

			delegated('input', input_1, (e) => $$props.manager.updateScheduleRule(get(rule).id, { time: e.target.value }));

			delegated('change', select, (e) => {
				const v = e.target.value;

				$$props.manager.updateScheduleRule(get(rule).id, {
					targetType: v,
					targetId: v === 'random' ? undefined : get(rule).targetId
				});
			});

			delegated('click', button_12, () => $$props.manager.removeScheduleRule(get(rule).id));
			append($$anchor, div_5);
		});

		var button_13 = sibling(node_7, 2);

		delegated('click', button_13, () => $$props.manager.addScheduleRule());
		append($$anchor, fragment_3);
	};

	const trash = ($$anchor) => {
		var fragment_5 = comment();
		var node_11 = first_child(fragment_5);

		{
			var consequent_10 = ($$anchor) => {
				var p_4 = root_19$2();

				append($$anchor, p_4);
			};

			var alternate_1 = ($$anchor) => {
				var fragment_6 = root_21$2();
				var div_6 = first_child(fragment_6);

				each(div_6, 21, () => get(s).trashedItems, (t) => t.id, ($$anchor, t) => {
					var div_7 = root_20$2();
					var span_3 = child(div_7);
					var span_4 = sibling(span_3, 2);
					var text_6 = only_child(span_4, true);
					var div_8 = sibling(span_4, 2);
					var button_14 = child(div_8);
					var button_15 = sibling(button_14, 2);

					template_effect(() => {
						set_style(span_3, urls.value[get(t).id]
							? `background-image:url(${urls.value[get(t).id]})`
							: '');

						set_text(text_6, get(t).name);
					});

					delegated('click', button_14, () => $$props.manager.restoreFromTrash(get(t).id));
					delegated('click', button_15, () => $$props.manager.purgeFromTrash(get(t).id));
					append($$anchor, div_7);
				});

				var button_16 = sibling(div_6, 2);

				delegated('click', button_16, () => $$props.manager.emptyTrash());
				append($$anchor, fragment_6);
			};

			if_block(node_11, ($$render) => {
				if (get(s).trashedItems.length === 0) $$render(consequent_10); else $$render(alternate_1, -1);
			});
		}

		append($$anchor, fragment_5);
	};

	const folders = ($$anchor) => {
		var fragment_7 = comment();
		var node_12 = first_child(fragment_7);

		{
			var consequent_16 = ($$anchor) => {
				var fragment_8 = root_29$2();
				var div_9 = sibling(first_child(fragment_8), 2);
				var button_17 = child(div_9);
				var button_18 = sibling(button_17, 2);

				var node_13 = sibling(div_9, 2);

				{
					var consequent_11 = ($$anchor) => {
						var p_7 = root_24$2();
						var text_7 = only_child(p_7, true);

						template_effect(() => set_text(text_7, get(folderMsg)));
						append($$anchor, p_7);
					};

					if_block(node_13, ($$render) => {
						if (get(folderMsg)) $$render(consequent_11);
					});
				}

				var node_14 = sibling(node_13, 2);

				{
					var consequent_15 = ($$anchor) => {
						var fragment_9 = root_28$2();
						var div_10 = first_child(fragment_9);

						each(div_10, 21, () => get(s).folders, (f) => f.id, ($$anchor, f) => {
							var div_11 = root_26$2();
							var div_12 = child(div_11);
							var span_5 = child(div_12);
							var text_8 = only_child(span_5, true);
							var span_6 = sibling(span_5, 2);
							var text_9 = child(span_6);
							var node_15 = sibling(text_9);

							{
								var consequent_12 = ($$anchor) => {
									var text_10 = text('· getrennt');

									append($$anchor, text_10);
								};

								if_block(node_15, ($$render) => {
									if (!get(f).connected) $$render(consequent_12);
								});
							}

							var node_16 = sibling(div_12, 2);

							{
								var consequent_13 = ($$anchor) => {
									var button_19 = root_25$2();

									template_effect(() => button_19.disabled = get(folderBusy));
									delegated('click', button_19, reconnectFolders);
									append($$anchor, button_19);
								};

								if_block(node_16, ($$render) => {
									if (!get(f).connected) $$render(consequent_13);
								});
							}

							var button_20 = sibling(node_16, 2);

							template_effect(() => {
								set_text(text_8, get(f).name);
								set_text(text_9, `${get(f).kind === 'video' ? 'Videos' : 'Bilder'} · ${get(f).count ?? ''}`);
								button_20.disabled = get(folderBusy);
							});

							delegated('click', button_20, () => $$props.manager.removeFolder(get(f).id));
							append($$anchor, div_11);
						});

						var node_17 = sibling(div_10, 2);

						{
							var consequent_14 = ($$anchor) => {
								var p_8 = root_27$2();

								append($$anchor, p_8);
							};

							var d = user_derived(() => get(s).folders.some((f) => !f.connected));

							if_block(node_17, ($$render) => {
								if (get(d)) $$render(consequent_14);
							});
						}

						append($$anchor, fragment_9);
					};

					if_block(node_14, ($$render) => {
						if (get(s).folders.length) $$render(consequent_15);
					});
				}

				template_effect(() => {
					button_17.disabled = get(folderBusy);
					button_18.disabled = get(folderBusy);
				});

				delegated('click', button_17, () => addFolderSrc('image'));
				delegated('click', button_18, () => addFolderSrc('video'));
				append($$anchor, fragment_8);
			};

			var alternate_2 = ($$anchor) => {
				var p_9 = root_30$2();

				append($$anchor, p_9);
			};

			if_block(node_12, ($$render) => {
				if (foldersSupported) $$render(consequent_16); else $$render(alternate_2, -1);
			});
		}

		append($$anchor, fragment_7);
	};

	const native = $$props.app.capabilities.has('wallpaper');
	const wpState = useStore($$props.manager.state);
	const urls = useStore($$props.manager.urls);
	const themeMode = useStore($$props.app.theme.mode);
	let s = user_derived(() => wpState.value);
	let vm = user_derived(() => get(s).viewMode);
	let liveActive = state(null);

	user_effect(() => {
		if (get(s).liveWallpaper && get(s).deviceMobile && native) {
			void $$props.app.capabilities.get('live-wallpaper')?.isActive().then((v) => set(liveActive, v, true));
		} else set(liveActive, null);
	});

	// Schedule image picker.
	let pickerRuleId = state(null);

	function onPickImage(id) {
		if (get(pickerRuleId)) $$props.manager.updateScheduleRule(get(pickerRuleId), { targetType: 'item', targetId: id });

		set(pickerRuleId, null);
	}

	// Theme-preset UI state.
	let presetName = state('');

	let exportText = state('');
	let importOpen = state(false);
	let importText = state('');
	let importMsg = state('');
	const opt = (arr) => arr.map((x) => ({ value: String(x.value), label: x.label }));

	// Folder sources.
	const foldersSupported = $$props.app.capabilities.has('folders');

	let folderBusy = state(false);
	let folderMsg = state('');

	async function addFolderSrc(kind) {
		set(folderBusy, true);
		set(folderMsg, '');

		const r = await $$props.manager.addFolder(kind);

		set(folderBusy, false);

		set(
			folderMsg,
			r.ok
				? `${r.count} Datei(en) aus dem Ordner übernommen.`
				: '',
			true
		);
	}

	async function reconnectFolders() {
		set(folderBusy, true);
		await $$props.manager.reconnectFolders();
		set(folderBusy, false);
	}

	// Declarative sections. `show` closures read `s`/`vm` → reactive in SettingsView.
	let sections = user_derived(() => [
		// Geräte (native only)
		...native
			? [
				{
					title: 'Geräte',
					category: 'Verhalten',
					defs: [
						{
							key: 'deviceMobile',
							type: 'toggle',
							label: 'Handy (Android)',
							desc: 'Systemhintergrund, Live-Wallpaper, Auto-OS. Aus: reine In-App-Ansicht.'
						},

						{
							key: 'liveWallpaper',
							type: 'toggle',
							label: 'Live-Wallpaper',
							desc: 'Animierter Systemhintergrund (Bild-Übergänge + Video).',
							show: () => get(s).deviceMobile
						},

						{
							type: 'custom',
							customId: 'live',
							show: () => get(s).deviceMobile && get(s).liveWallpaper
						}
					]
				}
			]
			: [],

		// Ansicht
		{
			title: 'Ansicht',
			category: 'Ansicht',
			defs: [
				{
					key: 'viewMode',
					type: 'segment',
					label: 'Anordnung',
					options: opt(VIEW_MODES)
				},

				// per-mode geometry
				{
					key: 'wallColumns',
					type: 'slider',
					label: 'Spalten (0 = Auto)',
					min: 0,
					max: 8,
					step: 1,
					show: () => get(vm) === 'wall'
				},

				{
					key: 'hexColumns',
					type: 'slider',
					label: 'Spalten (über die Breite)',
					min: 2,
					max: 6,
					step: 1,
					show: () => get(vm) === 'geometric'
				},

				{
					key: 'hexSize',
					type: 'slider',
					label: 'Wabengröße (0 = Auto nach Spalten)',
					min: 0,
					max: 160,
					step: 4,
					unit: 'px',
					show: () => get(vm) === 'geometric'
				},

				{
					key: 'hexArc',
					type: 'toggle',
					label: 'Bogen beim Scrollen',
					desc: 'Waben krümmen sich beim Hoch-/Runterscrollen und blenden oben/unten aus.',
					show: () => get(vm) === 'geometric'
				},

				{
					key: 'hexArcIntensity',
					type: 'slider',
					label: 'Bogen-Intensität',
					min: 0,
					max: 30,
					step: 1,
					show: () => get(vm) === 'geometric' && get(s).hexArc
				},

				{
					key: 'hexFadeStart',
					type: 'slider',
					label: 'Ausblenden ab Rand',
					desc: 'Je kleiner, desto früher (weiter innen) blenden die Waben oben/unten aus.',
					min: 30,
					max: 95,
					step: 5,
					unit: '%',
					show: () => get(vm) === 'geometric' && get(s).hexArc
				},

				{
					key: 'hexOffsetX',
					type: 'slider',
					label: 'Streifen verschieben (horizontal)',
					desc: 'Ganzen Waben-Streifen nach links/rechts schieben zum Zentrieren.',
					min: -200,
					max: 200,
					step: 5,
					unit: 'px',
					show: () => get(vm) === 'geometric'
				},

				{
					key: 'sandySide',
					type: 'segment',
					label: 'Kleine Bilder',
					options: [
						{ value: 'left', label: 'Links' },
						{ value: 'right', label: 'Rechts' }
					],
					show: () => get(vm) === 'sandy'
				},

				{
					key: 'handSpread',
					type: 'slider',
					label: 'Fächerung',
					min: 2,
					max: 16,
					step: 1,
					show: () => get(vm) === 'hand'
				},

				{
					key: 'handOffsetX',
					type: 'slider',
					label: 'Fächer verschieben (horizontal)',
					desc: 'Ganzen Kartenfächer nach links/rechts schieben.',
					min: -200,
					max: 200,
					step: 5,
					unit: 'px',
					show: () => get(vm) === 'hand'
				},
				{ type: 'custom', customId: 'presets' }
			]
		},

		// Erscheinungsbild
		{
			title: 'Erscheinungsbild',
			category: 'Darstellung',
			defs: [
				{
					key: 'themeMode',
					type: 'segment',
					label: 'Modus',
					options: [
						{ value: 'auto', label: 'Auto' },
						{ value: 'light', label: 'Hell' },
						{ value: 'dark', label: 'Dunkel' }
					]
				},

				{
					key: 'schemeCharacter',
					type: 'segment',
					label: 'Farbcharakter',
					options: opt(SCHEME_CHARACTERS)
				},

				{
					key: 'finish',
					type: 'segment',
					label: 'Finish',
					options: opt(FINISHES)
				},

				{
					key: 'paletteBehaviour',
					type: 'segment',
					label: 'Palette',
					options: [
						{ value: 'follow', label: 'Wallpaper folgen' },
						{ value: 'fixed', label: 'Feste Farbe' },
						{ value: 'keep', label: 'Beibehalten' }
					]
				},

				{
					key: 'fixedSeed',
					type: 'color',
					label: 'Feste Farbe',
					show: () => get(s).paletteBehaviour === 'fixed'
				},

				{
					key: 'themeContrast',
					type: 'slider',
					label: 'Kontrast',
					min: -1,
					max: 1,
					step: 0.1
				},

				{
					key: 'uiScale',
					type: 'slider',
					label: 'UI-Größe',
					min: 0.5,
					max: 2,
					step: 0.05,
					unit: '×'
				},
				{ type: 'custom', customId: 'themePresets' }
			]
		},

		// Wallpaper
		{
			title: 'Wallpaper',
			category: 'Darstellung',
			defs: [
				{
					key: 'fillMode',
					type: 'segment',
					label: 'Anpassung',
					options: opt(FILL_MODES)
				},

				{
					key: 'dim',
					type: 'slider',
					label: 'Abdunkeln',
					min: 0,
					max: 0.85,
					step: 0.05
				},

				{
					key: 'autoRecolour',
					type: 'toggle',
					label: 'Neue Wallpaper auto-umfärben',
					desc: 'Beim Hinzufügen eine umgefärbte Kopie speichern.'
				},

				{
					key: 'recolourPalette',
					type: 'select',
					label: 'Umfärb-Palette',
					options: opt(RECOLOUR_PALETTES),
					show: () => get(s).autoRecolour
				}
			]
		},

		// Video
		{
			title: 'Video',
			category: 'Darstellung',
			defs: [
				{
					key: 'muteVideo',
					type: 'toggle',
					label: 'Video stummschalten'
				},

				{
					key: 'videoVolume',
					type: 'slider',
					label: 'Lautstärke',
					min: 0,
					max: 100,
					step: 5,
					unit: '%',
					show: () => !get(s).muteVideo
				}
			]
		},

		// Kacheln
		{
			title: 'Kacheln',
			category: 'Darstellung',
			defs: [
				{
					key: 'tileSize',
					type: 'slider',
					label: 'Größe',
					min: 80,
					max: 240,
					step: 10,
					unit: 'px'
				},

				{
					key: 'tileRadius',
					type: 'slider',
					label: 'Eckenradius',
					min: 0,
					max: 28,
					step: 2,
					unit: 'px'
				}
			]
		},

		// Übergang
		{
			title: 'Übergang beim Wechsel',
			category: 'Darstellung',
			defs: [
				{
					key: 'transitionType',
					type: 'segment',
					label: 'Animation',
					options: opt(TRANSITIONS),
					show: () => !get(s).randomShader
				},

				{
					key: 'randomShader',
					type: 'toggle',
					label: 'Zufalls-Shader pro Wechsel',
					desc: 'Jedes Mal ein anderer GPU-Übergang.'
				},

				{
					key: 'transitionMs',
					type: 'slider',
					label: 'Dauer',
					min: 150,
					max: 2000,
					step: 50,
					unit: 'ms'
				}
			]
		},

		// Automatischer Wechsel
		{
			title: 'Automatischer Wechsel',
			category: 'Automatik',
			defs: [
				{
					key: 'randomEnabled',
					type: 'toggle',
					label: 'Wallpaper automatisch wechseln'
				},

				{
					key: 'randomIntervalSec',
					type: 'slider',
					label: 'Intervall',
					min: 10,
					max: 3600,
					step: 10,
					unit: 's',
					show: () => get(s).randomEnabled
				},

				{
					key: 'randomFavOnly',
					type: 'toggle',
					label: 'Nur Favoriten',
					show: () => get(s).randomEnabled
				},

				{
					key: 'includeImages',
					type: 'toggle',
					label: 'Bilder einschließen',
					show: () => get(s).randomEnabled
				},

				{
					key: 'includeVideos',
					type: 'toggle',
					label: 'Videos einschließen',
					show: () => get(s).randomEnabled
				},

				{
					type: 'custom',
					customId: 'osTargets',
					show: () => get(s).randomEnabled && native && get(s).deviceMobile && !get(s).liveWallpaper
				}
			]
		},

		// Zeitplan
		{
			title: 'Zeitplan',
			category: 'Automatik',
			defs: [
				{
					key: 'scheduleEnabled',
					type: 'toggle',
					label: 'Wallpaper nach Uhrzeit wechseln'
				},

				{
					type: 'custom',
					customId: 'schedule',
					show: () => get(s).scheduleEnabled
				}
			]
		},

		// Verhalten
		{
			title: 'Verhalten',
			category: 'Verhalten',
			defs: [
				{
					key: 'closeOnSelection',
					type: 'toggle',
					label: 'Beim Antippen schließen',
					desc: 'Picker schließt sich, sobald ein Wallpaper gewählt wird.'
				},

				{
					key: 'alwaysFilterBar',
					type: 'toggle',
					label: 'Filterleiste immer zeigen'
				},

				{
					key: 'alwaysSearchBar',
					type: 'toggle',
					label: 'Suchleiste immer zeigen'
				}
			]
		},

		// Wallhaven
		{
			title: 'Wallhaven',
			category: 'Quellen',
			defs: [
				{
					key: 'whColumns',
					type: 'slider',
					label: 'Spalten',
					min: 2,
					max: 6,
					step: 1
				},

				{
					key: 'whApiKey',
					type: 'text',
					label: 'API-Key (für NSFW)',
					placeholder: 'Wallhaven API-Key'
				}
			]
		},

		// KI (nur Anschluss — Tagging-Backend folgt)
		{
			title: 'KI',
			category: 'Quellen',
			defs: [
				{
					key: 'aiEnabled',
					type: 'toggle',
					label: 'KI anschließen',
					desc: 'Später: automatisches Tagging. Vorerst nur die Verbindungsdaten.'
				},

				{
					key: 'aiEndpoint',
					type: 'text',
					label: 'Endpunkt',
					placeholder: 'http://localhost:11434',
					show: () => get(s).aiEnabled
				},

				{
					key: 'aiModel',
					type: 'text',
					label: 'Modell',
					placeholder: 'z. B. llava / wd14-tagger',
					show: () => get(s).aiEnabled
				},

				{
					key: 'aiApiKey',
					type: 'text',
					label: 'API-Key (optional)',
					placeholder: 'falls nötig',
					show: () => get(s).aiEnabled
				},

				{
					type: 'custom',
					customId: 'aiNote',
					show: () => get(s).aiEnabled
				}
			]
		},

		// Speicherort / Pfade
		{
			title: 'Ordner',
			category: 'Quellen',
			defs: [{ type: 'custom', customId: 'folders' }]
		},

		{
			title: 'Speicherort',
			category: 'Quellen',
			defs: [
				{
					key: 'wallpaperDir',
					type: 'text',
					label: 'Wallpaper-Ordner',
					placeholder: 'Standard (App-Speicher)'
				},

				{
					key: 'videoDir',
					type: 'text',
					label: 'Video-Wallpaper-Ordner',
					placeholder: 'Standard = Wallpaper-Ordner'
				},
				{ type: 'custom', customId: 'pathsNote' }
			]
		},

		// Menü
		{
			title: 'Menü',
			category: 'Verhalten',
			defs: [
				{
					key: 'menuSide',
					type: 'segment',
					label: 'Seite',
					options: [
						{ value: 'left', label: 'Links' },
						{ value: 'right', label: 'Rechts' }
					]
				},

				{
					key: 'menuMode',
					type: 'segment',
					label: 'Verhalten',
					options: [
						{ value: 'auto', label: 'Ausblenden' },
						{ value: 'pinned', label: 'Fest' }
					]
				},

				{
					key: 'autoHideMs',
					type: 'slider',
					label: 'Ausblenden nach',
					min: 500,
					max: 10000,
					step: 500,
					unit: 'ms',
					show: () => get(s).menuMode !== 'pinned'
				}
			]
		},

		// Papierkorb
		{
			title: 'Papierkorb',
			category: 'Daten',
			defs: [
				{
					key: 'trashAutoDelete',
					type: 'toggle',
					label: 'Automatisch endgültig löschen'
				},

				{
					key: 'trashRetentionDays',
					type: 'slider',
					label: 'Aufbewahrung',
					min: 1,
					max: 90,
					step: 1,
					unit: ' Tage',
					show: () => get(s).trashAutoDelete
				},
				{ type: 'custom', customId: 'trash' }
			]
		},

		// Hilfe
		{
			title: 'Hilfe',
			category: 'Verhalten',
			defs: [
				{
					type: 'button',
					label: 'Einführung',
					desc: 'Die Willkommens-Tour erneut ansehen.',
					buttonLabel: 'Erneut anzeigen',
					show: () => get(s).deviceMobile,
					onClick: () => {
						$$props.app.config.set('skwd-wall', 'introSeen', false);

						// Re-open the view so onOpen() shows the intro again.
						$$props.app.workspace.closeView('wallpaper-picker');

						$$props.app.workspace.openView('wallpaper-picker');
					}
				}
			]
		}
	]);

	const schema = {
		get sections() {
			return get(sections);
		},

		get(key) {
			if (key === 'themeMode') return themeMode.value;

			return get(s)[key];
		},

		set(key, value) {
			if (key === 'themeMode') {
				$$props.app.theme.setMode(value);

				return;
			}

			$$props.manager.setField(key, value);
		}
	};

	function doExport() {
		set(exportText, $$props.manager.exportThemePresets(), true);
	}

	function doImport() {
		const n = $$props.manager.importThemePresets(get(importText));

		set(importMsg, n < 0 ? 'Ungültiges JSON' : `${n} Preset(s) importiert`, true);

		if (n >= 0) {
			set(importText, '');
			set(importOpen, false);
			setTimeout(() => set(importMsg, ''), 2500);
		}
	}

	var fragment_10 = root_31$1();
	var node_18 = first_child(fragment_10);

	{
		let $0 = user_derived(() => ({
			live,
			presets,
			themePresets,
			osTargets,
			schedule,
			trash,
			aiNote,
			pathsNote,
			folders
		}));

		SettingsView(node_18, {
			get schema() {
				return schema;
			},

			get custom() {
				return get($0);
			}
		});
	}

	var node_19 = sibling(node_18, 2);

	{
		var consequent_17 = ($$anchor) => {
			ImagePicker($$anchor, {
				get manager() {
					return $$props.manager;
				},
				title: 'Bild für Zeitplan wählen',
				onpick: onPickImage,
				onclose: () => set(pickerRuleId, null)
			});
		};

		if_block(node_19, ($$render) => {
			if (get(pickerRuleId)) $$render(consequent_17);
		});
	}

	append($$anchor, fragment_10);
	pop();
}

delegate(['click', 'keydown', 'input', 'change']);

/*! Capacitor: https://capacitorjs.com/ - MIT License */
var ExceptionCode;
(function (ExceptionCode) {
    /**
     * API is not implemented.
     *
     * This usually means the API can't be used because it is not implemented for
     * the current platform.
     */
    ExceptionCode["Unimplemented"] = "UNIMPLEMENTED";
    /**
     * API is not available.
     *
     * This means the API can't be used right now because:
     *   - it is currently missing a prerequisite, such as network connectivity
     *   - it requires a particular platform or browser version
     */
    ExceptionCode["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
class CapacitorException extends Error {
    constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
    }
}
const getPlatformId = (win) => {
    var _a, _b;
    if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return 'android';
    }
    else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return 'ios';
    }
    else {
        return 'web';
    }
};

const createCapacitor = (win) => {
    const capCustomPlatform = win.CapacitorCustomPlatform || null;
    const cap = win.Capacitor || {};
    const Plugins = (cap.Plugins = cap.Plugins || {});
    const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
    };
    const isNativePlatform = () => getPlatform() !== 'web';
    const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            // JS implementation available for the current platform.
            return true;
        }
        if (getPluginHeader(pluginName)) {
            // Native implementation available.
            return true;
        }
        return false;
    };
    const getPluginHeader = (pluginName) => { var _a; return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName); };
    const handleError = (err) => win.console.error(err);
    const registeredPlugins = new Map();
    const registerPlugin = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
                jsImplementation =
                    typeof jsImplementations[platform] === 'function'
                        ? (jsImplementation = await jsImplementations[platform]())
                        : (jsImplementation = jsImplementations[platform]);
            }
            else if (capCustomPlatform !== null && !jsImplementation && 'web' in jsImplementations) {
                jsImplementation =
                    typeof jsImplementations['web'] === 'function'
                        ? (jsImplementation = await jsImplementations['web']())
                        : (jsImplementation = jsImplementations['web']);
            }
            return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
                const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
                if (methodHeader) {
                    if (methodHeader.rtype === 'promise') {
                        return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                    }
                    else {
                        return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                    }
                }
                else if (impl) {
                    return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
                }
            }
            else if (impl) {
                return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            }
            else {
                throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
        };
        const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
                const p = loadPluginImplementation().then((impl) => {
                    const fn = createPluginMethod(impl, prop);
                    if (fn) {
                        const p = fn(...args);
                        remove = p === null || p === void 0 ? void 0 : p.remove;
                        return p;
                    }
                    else {
                        throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                    }
                });
                if (prop === 'addListener') {
                    p.remove = async () => remove();
                }
                return p;
            };
            // Some flair ✨
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, 'name', {
                value: prop,
                writable: false,
                configurable: false,
            });
            return wrapper;
        };
        const addListener = createPluginMethodWrapper('addListener');
        const removeListener = createPluginMethodWrapper('removeListener');
        const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
                const callbackId = await call;
                removeListener({
                    eventName,
                    callbackId,
                }, callback);
            };
            const p = new Promise((resolve) => call.then(() => resolve({ remove })));
            p.remove = async () => {
                console.warn(`Using addListener() without 'await' is deprecated.`);
                await remove();
            };
            return p;
        };
        const proxy = new Proxy({}, {
            get(_, prop) {
                switch (prop) {
                    // https://github.com/facebook/react/issues/20030
                    case '$$typeof':
                        return undefined;
                    case 'toJSON':
                        return () => ({});
                    case 'addListener':
                        return pluginHeader ? addListenerNative : addListener;
                    case 'removeListener':
                        return removeListener;
                    default:
                        return createPluginMethodWrapper(prop);
                }
            },
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: new Set([...Object.keys(jsImplementations), ...(pluginHeader ? [platform] : [])]),
        });
        return proxy;
    };
    // Add in convertFileSrc for web, it will already be available in native context
    if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
    }
    cap.getPlatform = getPlatform;
    cap.handleError = handleError;
    cap.isNativePlatform = isNativePlatform;
    cap.isPluginAvailable = isPluginAvailable;
    cap.registerPlugin = registerPlugin;
    cap.Exception = CapacitorException;
    cap.DEBUG = !!cap.DEBUG;
    cap.isLoggingEnabled = !!cap.isLoggingEnabled;
    return cap;
};
const initCapacitorGlobal = (win) => (win.Capacitor = createCapacitor(win));

const Capacitor = /*#__PURE__*/ initCapacitorGlobal(typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
        ? self
        : typeof window !== 'undefined'
            ? window
            : typeof global !== 'undefined'
                ? global
                : {});
const registerPlugin = Capacitor.registerPlugin;

/**
 * Base class web plugins should extend.
 */
class WebPlugin {
    constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
    }
    addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        // If we haven't added a window listener for this event and it requires one,
        // go ahead and add it
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
        }
        if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
    }
    async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
    }
    notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
            if (retainUntilConsumed) {
                let args = this.retainedEventArguments[eventName];
                if (!args) {
                    args = [];
                }
                args.push(data);
                this.retainedEventArguments[eventName] = args;
            }
            return;
        }
        listeners.forEach((listener) => listener(data));
    }
    hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
    }
    registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
                this.notifyListeners(pluginEventName, event);
            },
        };
    }
    unimplemented(msg = 'not implemented') {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
    }
    unavailable(msg = 'not available') {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
    }
    async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
            return;
        }
        const index = listeners.indexOf(listenerFunc);
        if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
        }
        // If there are no more listeners for this type of event,
        // remove the window listener
        if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
        }
    }
    addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
    }
    removeWindowListener(handle) {
        if (!handle) {
            return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
    }
    sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
            return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
        });
    }
}
/******** END WEB VIEW PLUGIN ********/
/******** COOKIES PLUGIN ********/
/**
 * Safely web encode a string value (inspired by js-cookie)
 * @param str The string value to encode
 */
const encode = (str) => encodeURIComponent(str)
    .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
    .replace(/[()]/g, escape);
/**
 * Safely web decode a string value (inspired by js-cookie)
 * @param str The string value to decode
 */
const decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
class CapacitorCookiesPluginWeb extends WebPlugin {
    async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(';').forEach((cookie) => {
            if (cookie.length <= 0)
                return;
            // Replace first "=" with CAP_COOKIE to prevent splitting on additional "="
            let [key, value] = cookie.replace(/=/, 'CAP_COOKIE').split('CAP_COOKIE');
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
        });
        return cookieMap;
    }
    async setCookie(options) {
        try {
            // Safely Encoded Key/Value
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            // Clean & sanitize options
            const expires = options.expires ? `; expires=${options.expires.replace('expires=', '')}` : '';
            const path = (options.path || '/').replace('path=', ''); // Default is "path=/"
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : '';
            document.cookie = `${encodedKey}=${encodedValue || ''}${expires}; path=${path}; ${domain};`;
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async deleteCookie(options) {
        try {
            document.cookie = `${options.key}=; Max-Age=0`;
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async clearCookies() {
        try {
            const cookies = document.cookie.split(';') || [];
            for (const cookie of cookies) {
                document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    async clearAllCookies() {
        try {
            await this.clearCookies();
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}
registerPlugin('CapacitorCookies', {
    web: () => new CapacitorCookiesPluginWeb(),
});
// UTILITY FUNCTIONS
/**
 * Read in a Blob value and return it as a base64 string
 * @param blob The blob value to convert to a base64 string
 */
const readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const base64String = reader.result;
        // remove prefix "data:application/pdf;base64,"
        resolve(base64String.indexOf(',') >= 0 ? base64String.split(',')[1] : base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
});
/**
 * Normalize an HttpHeaders map by lowercasing all of the values
 * @param headers The HttpHeaders object to normalize
 */
const normalizeHttpHeaders = (headers = {}) => {
    const originalKeys = Object.keys(headers);
    const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
    const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
    }, {});
    return normalized;
};
/**
 * Builds a string of url parameters that
 * @param params A map of url parameters
 * @param shouldEncode true if you should encodeURIComponent() the values (true by default)
 */
const buildUrlParams = (params, shouldEncode = true) => {
    if (!params)
        return null;
    const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
            item = '';
            value.forEach((str) => {
                encodedValue = shouldEncode ? encodeURIComponent(str) : str;
                item += `${key}=${encodedValue}&`;
            });
            // last character will always be "&" so slice it off
            item.slice(0, -1);
        }
        else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
    }, '');
    // Remove initial "&" from the reduce
    return output.substr(1);
};
/**
 * Build the RequestInit object based on the options passed into the initial request
 * @param options The Http plugin options
 * @param extra Any extra RequestInit values
 */
const buildRequestInit = (options, extra = {}) => {
    const output = Object.assign({ method: options.method || 'GET', headers: options.headers }, extra);
    // Get the content-type
    const headers = normalizeHttpHeaders(options.headers);
    const type = headers['content-type'] || '';
    // If body is already a string, then pass it through as-is.
    if (typeof options.data === 'string') {
        output.body = options.data;
    }
    // Build request initializers based off of content-type
    else if (type.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
        }
        output.body = params.toString();
    }
    else if (type.includes('multipart/form-data') || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
                form.append(key, value);
            });
        }
        else {
            for (const key of Object.keys(options.data)) {
                form.append(key, options.data[key]);
            }
        }
        output.body = form;
        const headers = new Headers(output.headers);
        headers.delete('content-type'); // content-type will be set by `window.fetch` to includy boundary
        output.headers = headers;
    }
    else if (type.includes('application/json') || typeof options.data === 'object') {
        output.body = JSON.stringify(options.data);
    }
    return output;
};
// WEB IMPLEMENTATION
class CapacitorHttpPluginWeb extends WebPlugin {
    /**
     * Perform an Http request given a set of options
     * @param options Options to build the HTTP request
     */
    async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get('content-type') || '';
        // Default to 'text' responseType so no parsing happens
        let { responseType = 'text' } = response.ok ? options : {};
        // If the response content-type is json, force the response to be json
        if (contentType.includes('application/json')) {
            responseType = 'json';
        }
        let data;
        let blob;
        switch (responseType) {
            case 'arraybuffer':
            case 'blob':
                blob = await response.blob();
                data = await readBlobAsBase64(blob);
                break;
            case 'json':
                data = await response.json();
                break;
            case 'document':
            case 'text':
            default:
                data = await response.text();
        }
        // Convert fetch headers to Capacitor HttpHeaders
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return {
            data,
            headers,
            status: response.status,
            url: response.url,
        };
    }
    /**
     * Perform an Http GET request given a set of options
     * @param options Options to build the HTTP request
     */
    async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: 'GET' }));
    }
    /**
     * Perform an Http POST request given a set of options
     * @param options Options to build the HTTP request
     */
    async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: 'POST' }));
    }
    /**
     * Perform an Http PUT request given a set of options
     * @param options Options to build the HTTP request
     */
    async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: 'PUT' }));
    }
    /**
     * Perform an Http PATCH request given a set of options
     * @param options Options to build the HTTP request
     */
    async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: 'PATCH' }));
    }
    /**
     * Perform an Http DELETE request given a set of options
     * @param options Options to build the HTTP request
     */
    async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: 'DELETE' }));
    }
}
const CapacitorHttp = registerPlugin('CapacitorHttp', {
    web: () => new CapacitorHttpPluginWeb(),
});
/******** END HTTP PLUGIN ********/
/******** SYSTEM BARS PLUGIN ********/
/**
 * Available status bar styles.
 */
var SystemBarsStyle;
(function (SystemBarsStyle) {
    /**
     * Light system bar content on a dark background.
     *
     * @since 8.0.0
     */
    SystemBarsStyle["Dark"] = "DARK";
    /**
     * For dark system bar content on a light background.
     *
     * @since 8.0.0
     */
    SystemBarsStyle["Light"] = "LIGHT";
    /**
     * The style is based on the device appearance or the underlying content.
     * If the device is using Dark mode, the system bars content will be light.
     * If the device is using Light mode, the system bars content will be dark.
     *
     * @since 8.0.0
     */
    SystemBarsStyle["Default"] = "DEFAULT";
})(SystemBarsStyle || (SystemBarsStyle = {}));
/**
 * Available system bar types.
 */
var SystemBarType;
(function (SystemBarType) {
    /**
     * The top status bar on both Android and iOS.
     *
     * @since 8.0.0
     */
    SystemBarType["StatusBar"] = "StatusBar";
    /**
     * The navigation bar (or gesture bar on iOS) on both Android and iOS.
     *
     * @since 8.0.0
     */
    SystemBarType["NavigationBar"] = "NavigationBar";
})(SystemBarType || (SystemBarType = {}));
class SystemBarsPluginWeb extends WebPlugin {
    async setStyle() {
        this.unavailable('not available for web');
    }
    async setAnimation() {
        this.unavailable('not available for web');
    }
    async show() {
        this.unavailable('not available for web');
    }
    async hide() {
        this.unavailable('not available for web');
    }
}
registerPlugin('SystemBars', {
    web: () => new SystemBarsPluginWeb(),
});

const native = Capacitor.isNativePlatform();
async function whJson(url) {
  if (native) {
    const res2 = await CapacitorHttp.get({ url });
    if (res2.status < 200 || res2.status >= 300) throw new Error(`Wallhaven ${res2.status}`);
    return typeof res2.data === "string" ? JSON.parse(res2.data) : res2.data;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wallhaven ${res.status}`);
  return res.json();
}
const WH_SORTINGS = [
  { value: "toplist", label: "Top" },
  { value: "date_added", label: "Neu" },
  { value: "views", label: "Beliebt" },
  { value: "favorites", label: "Favoriten" },
  { value: "random", label: "Zufall" },
  { value: "relevance", label: "Relevanz" }
];
const WH_CATEGORIES = ["Allgemein", "Anime", "Menschen"];
const DEFAULT_WH_FILTERS = {
  query: "",
  sorting: "toplist",
  categories: [true, true, true],
  ratio: "all"
};
function proxify(url) {
  if (native) return url;
  return url.replace("https://th.wallhaven.cc", "/wh/th").replace("https://w.wallhaven.cc", "/wh/img");
}
const WH_API = native ? "https://wallhaven.cc/api/v1" : "/wh/api";
async function searchWallhaven(f, page = 1) {
  const q = f.query.trim();
  let sorting = f.sorting;
  if (sorting === "relevance" && !q) sorting = "toplist";
  const cats = f.categories.map((b) => b ? "1" : "0").join("");
  const params = new URLSearchParams({
    purity: "100",
    // SFW only
    categories: cats === "000" ? "111" : cats,
    sorting,
    page: String(page)
  });
  if (q) params.set("q", q);
  if (sorting === "toplist") params.set("topRange", "1M");
  if (f.ratio === "landscape") params.set("ratios", "landscape");
  else if (f.ratio === "portrait") params.set("ratios", "portrait");
  const json = await whJson(`${WH_API}/search?${params.toString()}`);
  const data = json?.data ?? [];
  const lastPage = json?.meta?.last_page ?? page;
  return {
    results: data.map((d) => ({
      id: String(d.id),
      thumb: proxify(d.thumbs?.small ?? d.thumbs?.original ?? ""),
      full: proxify(d.path ?? ""),
      width: d.dimension_x ?? 0,
      height: d.dimension_y ?? 0,
      resolution: d.resolution ?? ""
    })),
    lastPage
  };
}
async function downloadWallhaven(r) {
  let blob;
  if (native) {
    const res = await CapacitorHttp.get({ url: r.full, responseType: "blob" });
    if (res.status < 200 || res.status >= 300) throw new Error(`Download ${res.status}`);
    const mime = res.headers?.["Content-Type"] || res.headers?.["content-type"] || "image/jpeg";
    blob = await (await fetch(`data:${mime};base64,${res.data}`)).blob();
  } else {
    const res = await fetch(r.full);
    if (!res.ok) throw new Error(`Download ${res.status}`);
    blob = await res.blob();
  }
  const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  return new File([blob], `wallhaven-${r.id}.${ext}`, { type: blob.type });
}

var root$1 = from_html(`<video class="tile-video svelte-1lk0sb9" loop="" playsinline="" preload="metadata"></video>`, 2);
var root_1$1 = from_html(`<!> <span class="tile-vidbadge svelte-1lk0sb9" aria-hidden="true">▶</span>`, 1);
var root_2$1 = from_html(`<span class="badge svelte-1lk0sb9"><!></span>`);
var root_3$1 = from_html(`<span class="tile-favmark svelte-1lk0sb9"><!></span>`);
var root_4$1 = from_html(`<span class="tile-name svelte-1lk0sb9"> </span>`);
var root_5$1 = from_html(`<!> <!> <!> <!>`, 1);
var root_6$1 = from_html(`<button> <span class="coll-count svelte-1lk0sb9"> </span></button>`);
var root_7$1 = from_html(`<input class="coll-new svelte-1lk0sb9" placeholder="Name…" spellcheck="false"/>`);
var root_8$1 = from_html(`<button class="coll-add svelte-1lk0sb9" title="Neue Sammlung" aria-label="Neue Sammlung">＋</button>`);
var root_9$1 = from_html(`<div class="coll-bar svelte-1lk0sb9"><button>Alle</button> <!> <!></div>`);
var root_10$1 = from_html(`<div class="empty svelte-1lk0sb9"><h2 class="svelte-1lk0sb9">Wallpaper Engine</h2> <p>Wallpaper-Engine-Szenen laufen nur auf dem PC (Windows/Linux). Auf dem Handy &amp; im Web gibt es sie nicht — hier gehen Bilder und Videos.</p></div>`);
var root_11$1 = from_html(`<button class="empty-cta svelte-1lk0sb9"><!> Ordner verknüpfen</button>`);
var root_12$1 = from_html(`<div class="empty svelte-1lk0sb9"><h2 class="svelte-1lk0sb9">Noch keine Wallpaper</h2> <p>Lade dein erstes Bild hoch — die ganze App nimmt die Farben an.</p> <label class="upload-cta svelte-1lk0sb9"><!> Wallpaper hochladen <input type="file" accept="image/*,video/*" multiple="" hidden=""/></label> <p class="empty-or svelte-1lk0sb9">oder</p> <!> <button class="empty-cta svelte-1lk0sb9"><!> Online suchen</button></div>`);
var root_13$1 = from_html(`<div class="empty svelte-1lk0sb9"><h2 class="svelte-1lk0sb9">Keine Treffer</h2> <p>Kein Wallpaper passt zu den Filtern.</p> <button class="upload-cta svelte-1lk0sb9">Filter zurücksetzen</button></div>`);
var root_14$1 = from_html(`<button><!></button>`);
var root_15$1 = from_html(`<div class="hexwrap svelte-1lk0sb9"></div>`);
var root_16$1 = from_html(`<div class="stage slices svelte-1lk0sb9" role="presentation"></div>`);
var root_17$1 = from_html(`<div class="stage depth svelte-1lk0sb9" role="presentation"></div>`);
var root_18$1 = from_html(`<button></button>`);
var root_19$1 = from_html(`<div class="stage sandy svelte-1lk0sb9" role="presentation"><button><!></button> <!></div>`);
var root_20$1 = from_html(`<div class="stage hand svelte-1lk0sb9" role="presentation"></div>`);
var root_21$1 = from_html(`<div class="stage collection svelte-1lk0sb9" role="presentation"></div>`);
var root_22$1 = from_html(`<div class="gallery svelte-1lk0sb9"></div>`);
var root_23$1 = from_html(`<div class="sub-backdrop svelte-1lk0sb9" role="presentation"></div>`);
var root_24$1 = from_html(`<span class="sub-label svelte-1lk0sb9"> </span>`);
var root_25$1 = from_html(`<div><!></div>`);
var root_26$1 = from_html(`<aside></aside>`);
var root_27$1 = from_html(`<span class="rail-flag svelte-1lk0sb9"> </span>`);
var root_28$1 = from_html(`<div><!> <!></div>`);
var root_29$1 = from_html(`<div class="panel-backdrop svelte-1lk0sb9" role="presentation"></div>`);
var root_30$1 = from_html(`<button class="sp-off svelte-1lk0sb9" title="Suchleiste ausblenden" aria-label="Suchleiste ausblenden">×</button>`);
var root_31 = from_html(`<button> </button>`);
var root_32 = from_html(`<div class="sp-taglabel svelte-1lk0sb9">Nach Tags filtern</div> <div class="sp-tags svelte-1lk0sb9"></div>`, 1);
var root_33 = from_html(`<button class="sp-clear svelte-1lk0sb9">Filter zurücksetzen</button>`);
var root_34 = from_html(`<!> <div><div class="sp-head svelte-1lk0sb9"><!> Suche &amp; Tags <!></div> <input class="sp-input svelte-1lk0sb9" placeholder="Name oder Tag…" spellcheck="false"/> <!> <!></div>`, 1);
var root_35 = from_html(`<div class="settings-full svelte-1lk0sb9"><div class="settings-head svelte-1lk0sb9"><span>Einstellungen</span> <button class="icon-btn svelte-1lk0sb9" title="Schließen"><!></button></div> <div class="settings-body svelte-1lk0sb9"><!></div></div>`);
var root_36 = from_html(`<div class="settings-body svelte-1lk0sb9"><label class="add-upload svelte-1lk0sb9"><!> <span> </span> <input type="file" accept="image/*,video/*" multiple="" hidden=""/></label></div>`);
var root_37 = from_html(`<div class="wh-filters svelte-1lk0sb9"></div> <div class="wh-filters svelte-1lk0sb9"><!> <span class="wh-sep svelte-1lk0sb9"></span> <!></div>`, 1);
var root_38 = from_html(`<p class="wh-error svelte-1lk0sb9"> </p>`);
var root_39 = from_html(`<button class="wh-tile svelte-1lk0sb9" title="Ansehen"><span class="wh-res svelte-1lk0sb9"> </span></button>`);
var root_40 = from_html(`<p class="wh-info svelte-1lk0sb9">Lädt…</p>`);
var root_41 = from_html(`<p class="wh-info svelte-1lk0sb9">Keine Treffer.</p>`);
var root_42 = from_html(`<p class="wh-info svelte-1lk0sb9">Ende der Ergebnisse.</p>`);
var root_43 = from_html(`<div class="wh-head svelte-1lk0sb9"><div class="wh-search svelte-1lk0sb9"><input placeholder="z.B. landscape, anime, minimal…" spellcheck="false" class="svelte-1lk0sb9"/> <button aria-label="Suchen" class="svelte-1lk0sb9"><!></button> <button aria-label="Filter"><!></button></div> <!></div> <!> <div class="wh-scroll svelte-1lk0sb9"><div class="wh-grid svelte-1lk0sb9"></div> <!> <!> <!></div>`, 1);
var root_44 = from_html(`<div class="settings-full svelte-1lk0sb9"><div class="settings-head svelte-1lk0sb9"><span>Wallpaper hinzufügen</span> <button class="icon-btn svelte-1lk0sb9" title="Schließen"><!></button></div> <div class="add-tabs svelte-1lk0sb9"><button><!> Hochladen</button> <button><!> Online</button></div> <!></div>`);
var root_45 = from_html(`<span class="syswp-msg svelte-1lk0sb9"> </span>`);
var root_46 = from_html(`<div class="wh-preview svelte-1lk0sb9"><div class="syswp-top svelte-1lk0sb9"><button class="syswp-x svelte-1lk0sb9" title="Zurück"><!></button></div> <div class="wh-preview-img svelte-1lk0sb9"></div> <div class="syswp-bottom svelte-1lk0sb9"><!> <span class="wh-preview-meta svelte-1lk0sb9"> </span> <button class="syswp-set svelte-1lk0sb9"> </button></div></div>`);
var root_47 = from_html(`<div class="wh-preview svelte-1lk0sb9"><div class="syswp-top svelte-1lk0sb9"><button class="syswp-x svelte-1lk0sb9" title="Zurück"><!></button></div> <div class="wh-preview-img svelte-1lk0sb9"></div> <div class="syswp-bottom svelte-1lk0sb9"><div class="fx-chips svelte-1lk0sb9"></div> <button class="syswp-set svelte-1lk0sb9"> </button></div></div>`);
var root_48 = from_html(`<div class="syswp svelte-1lk0sb9"><div class="syswp-top svelte-1lk0sb9"><button class="syswp-x svelte-1lk0sb9" title="Schließen"><!></button></div> <div class="syswp-bottom svelte-1lk0sb9"><!> <div class="syswp-checks svelte-1lk0sb9"><button><!> Startbildschirm</button> <button><!> Sperrbildschirm</button></div> <button class="syswp-set svelte-1lk0sb9"> </button></div></div>`);
var root_49 = from_html(`<span class="tag-chip svelte-1lk0sb9"> <button aria-label="Tag entfernen" class="svelte-1lk0sb9">×</button></span>`);
var root_50 = from_html(`<span class="tag-empty svelte-1lk0sb9">Noch keine Tags</span>`);
var root_51 = from_html(`<input class="coll-new sm svelte-1lk0sb9" placeholder="Name…" spellcheck="false"/>`);
var root_52 = from_html(`<button class="coll-add sm svelte-1lk0sb9">＋ Neu</button>`);
var root_53 = from_html(`<div class="detail-overlay svelte-1lk0sb9" role="presentation"><div role="presentation"><div class="flip-inner svelte-1lk0sb9"><div class="flip-front svelte-1lk0sb9"></div> <div class="flip-back svelte-1lk0sb9"><button><!> <span> </span></button> <div class="tag-field svelte-1lk0sb9"><span class="tf-label svelte-1lk0sb9">Tags</span> <div class="tag-list svelte-1lk0sb9"><!> <!></div> <input class="tag-input svelte-1lk0sb9" placeholder="Tag eingeben + Enter…" spellcheck="false"/></div> <div class="tag-field svelte-1lk0sb9"><span class="tf-label svelte-1lk0sb9">Sammlungen</span> <div class="coll-chiprow svelte-1lk0sb9"><!> <!></div></div> <div class="detail-actions svelte-1lk0sb9"><button class="fx-big svelte-1lk0sb9"><!> Effekt</button> <button class="del-big svelte-1lk0sb9"><!> Löschen</button></div> <button class="done-big wide svelte-1lk0sb9"><!> Fertig</button></div></div></div></div>`);
var root_54 = from_html(`<div><div class="gallery-scroll svelte-1lk0sb9"><!> <!></div> <!> <div class="rail-zone svelte-1lk0sb9" role="toolbar" tabindex="0" aria-label="Werkzeugleiste"><!> <aside></aside></div> <!> <!> <!> <!> <!> <!> <!></div>`);

const $$css$1 = {
	hash: 'svelte-1lk0sb9',
	code: '.picker.svelte-1lk0sb9 {position:relative;height:100%;width:100%;overflow:hidden;}.gallery-scroll.svelte-1lk0sb9 {height:100%;overflow-y:auto;overflow-x:hidden;padding:var(--space-5) var(--space-4);}.picker.pinned[data-side=\'right\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9) {padding-right:232px;}.picker.pinned[data-side=\'left\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9) {padding-left:232px;}\n\n  /* ---- Wall (uniform grid) ---- */.gallery.svelte-1lk0sb9 {display:grid;gap:var(--space-3);}[data-mode=\'wall\'].svelte-1lk0sb9 .gallery:where(.svelte-1lk0sb9) {grid-template-columns:var(--wall-grid, repeat(auto-fill, minmax(var(--tile-size, 130px), 1fr)));}[data-mode=\'wall\'].svelte-1lk0sb9 .tile:where(.svelte-1lk0sb9) {aspect-ratio:3 / 4;}\n\n  /* ---- Centred stages (Slices/Depth/Sandy/Hand/Collection) ----\n     The active item is the camera centre; tiles are absolutely placed by their\n     distance to it and glide into place via CSS transitions on re-select. */[data-mode=\'slices\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9),\n  [data-mode=\'depth\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9),\n  [data-mode=\'sandy\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9),\n  [data-mode=\'hand\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9),\n  [data-mode=\'collection\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9) {overflow:hidden;padding:0;}\n  /* Own stacking context at z-index 0 → inner tiles can never cover the rail (25).\n     touch-action:none → vertical drags are handled as browse-flipping, not scroll. */.stage.svelte-1lk0sb9 {position:relative;width:100%;height:100%;z-index:0;touch-action:none;}.stage.hand.svelte-1lk0sb9, .stage.collection.svelte-1lk0sb9 {perspective:1400px;}.stage.svelte-1lk0sb9 .tile:where(.svelte-1lk0sb9) {position:absolute;transition:left 0.36s cubic-bezier(0.22,0.61,0.36,1), top 0.36s cubic-bezier(0.22,0.61,0.36,1),\n      width 0.36s cubic-bezier(0.22,0.61,0.36,1), height 0.36s cubic-bezier(0.22,0.61,0.36,1),\n      transform 0.36s cubic-bezier(0.22,0.61,0.36,1), opacity 0.3s ease;will-change:left, top, transform, opacity;}\n\n  /* Slices — wide filmstrip bands stacked vertically; active expands tall */.tile.slice.svelte-1lk0sb9 {border-radius:6px;box-shadow:0 8px 22px rgba(0,0,0,0.4);}.tile.slice.active.svelte-1lk0sb9 {box-shadow:0 14px 34px rgba(0,0,0,0.55);}\n\n  /* Depth — log stack, soft shadow grows toward the front */.tile.depthcard.svelte-1lk0sb9 {border-radius:var(--tile-radius, var(--radius-md));box-shadow:0 10px 26px rgba(0,0,0,0.4);}.tile.depthcard.active.svelte-1lk0sb9 {box-shadow:0 20px 44px rgba(0,0,0,0.6);}\n\n  /* Geometric (honeycomb) */.hexwrap.svelte-1lk0sb9 {position:relative;margin:0 auto;}.tile.hex.svelte-1lk0sb9 {position:absolute;clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);border-radius:0;border:none;}.tile.hex.active.svelte-1lk0sb9 {outline:none;box-shadow:inset 0 0 0 4px var(--color-primary);}\n\n  /* Sandy — big hero up top + thumbnail band along the bottom */.tile.sandy-hero.svelte-1lk0sb9 {transform:translate(-50%, -50%);border-radius:var(--tile-radius, var(--radius-md));box-shadow:0 18px 50px rgba(0,0,0,0.55);z-index:1;}.tile.sandy-thumb.svelte-1lk0sb9 {border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.4);}\n\n  /* Hand — card fan, centred on the active card */.tile.fan.svelte-1lk0sb9 {width:128px;height:200px;transform-origin:center;border-radius:10px;box-shadow:0 10px 26px rgba(0,0,0,0.45);}.tile.fan.active.svelte-1lk0sb9 {box-shadow:0 18px 40px rgba(0,0,0,0.6);}\n\n  /* Collection — vertical tilted deck; active card flips upright to the front */.tile.stack.svelte-1lk0sb9 {transform-origin:center;border-radius:var(--tile-radius, var(--radius-md));box-shadow:0 14px 34px rgba(0,0,0,0.5);backface-visibility:hidden;}.tile.stack.active.svelte-1lk0sb9 {box-shadow:0 24px 60px rgba(0,0,0,0.6);}\n\n  /* ---- Tiles base ---- */.tile.svelte-1lk0sb9 {position:relative;border:1px solid rgba(255,255,255,0.12);border-radius:var(--tile-radius, var(--radius-md));background-size:cover;background-position:center;background-color:var(--color-surface-variant);cursor:pointer;overflow:hidden;padding:0;transition:transform var(--transition), box-shadow var(--transition);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;}.tile.svelte-1lk0sb9:hover {box-shadow:0 6px 20px rgba(0,0,0,0.4);}.tile.active.svelte-1lk0sb9 {outline:3px solid var(--color-primary);outline-offset:-3px;}.tile-video.svelte-1lk0sb9 {position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;}.tile-vidbadge.svelte-1lk0sb9 {position:absolute;top:6px;left:6px;z-index:2;width:22px;height:22px;display:grid;place-items:center;border-radius:50%;font-size:0.6rem;background:rgba(0,0,0,0.55);color:#fff;padding-left:2px;}.badge.svelte-1lk0sb9 {position:absolute;top:6px;left:6px;background:var(--color-primary);color:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;}.tile-favmark.svelte-1lk0sb9 {position:absolute;top:6px;right:6px;color:#ff5d8f;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));display:grid;place-items:center;}[data-mode=\'slices\'].svelte-1lk0sb9 .tile-name:where(.svelte-1lk0sb9) {max-width:60%;}.tile-name.svelte-1lk0sb9 {position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:0.72rem;color:#fff;text-align:left;background:linear-gradient(transparent, rgba(0,0,0,0.7));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n\n  /* ---- Empty ---- */.empty.svelte-1lk0sb9 {height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--space-2);color:var(--text-muted);}.empty.svelte-1lk0sb9 h2:where(.svelte-1lk0sb9) {color:var(--text);margin:0;}.upload-cta.svelte-1lk0sb9 {margin-top:var(--space-3);display:inline-flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-5);background:var(--color-primary);color:#fff;border-radius:var(--radius-md);font-weight:600;cursor:pointer;}.empty-or.svelte-1lk0sb9 {margin:var(--space-2) 0 0;font-size:0.78rem;color:var(--text-faint);}.empty-cta.svelte-1lk0sb9 {display:inline-flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-5);background:var(--bg-elevated);border:1px solid var(--border);color:var(--text);border-radius:var(--radius-md);font-weight:600;cursor:pointer;}\n\n  /* ---- Vertical swipe-select rail (SKWD-style, skewed parallelogram) ---- */.rail-zone.svelte-1lk0sb9 {position:absolute;top:0;bottom:0;width:60px;z-index:25;touch-action:none;}.rail-zone[data-side=\'right\'].svelte-1lk0sb9 {right:0;}.rail-zone[data-side=\'left\'].svelte-1lk0sb9 {left:0;}.rail.svelte-1lk0sb9 {position:absolute;top:50%;display:flex;flex-direction:column;gap:5px;padding:8px 7px;background:color-mix(in srgb, var(--color-surface) 80%, transparent);backdrop-filter:blur(16px);transition:transform var(--transition), opacity var(--transition);opacity:0;pointer-events:none;}.rail-zone[data-side=\'right\'].svelte-1lk0sb9 .rail:where(.svelte-1lk0sb9) {right:3px;transform:translate(100%, -50%) skewY(-12deg);}.rail-zone[data-side=\'left\'].svelte-1lk0sb9 .rail:where(.svelte-1lk0sb9) {left:3px;transform:translate(-100%, -50%) skewY(-12deg);}.rail.shown.svelte-1lk0sb9 {opacity:1;pointer-events:auto;}.rail-zone[data-side=\'right\'].svelte-1lk0sb9 .rail.shown:where(.svelte-1lk0sb9) {transform:translate(0, -50%) skewY(-12deg);}.rail-zone[data-side=\'left\'].svelte-1lk0sb9 .rail.shown:where(.svelte-1lk0sb9) {transform:translate(0, -50%) skewY(-12deg);}.rail-item.svelte-1lk0sb9 {width:48px;height:40px;border-radius:2px;position:relative;display:grid;place-items:center;color:var(--text-muted);transition:background var(--transition), transform var(--transition), color var(--transition);}\n  /* counter-skew the glyph so icons stay upright inside the slanted bar */.rail-item.svelte-1lk0sb9 > svg {transform:skewY(12deg);}.rail-item.on.svelte-1lk0sb9 {background:color-mix(in srgb, var(--color-primary) 35%, transparent);color:var(--text);}.rail-item.open.svelte-1lk0sb9 {background:color-mix(in srgb, var(--color-primary) 20%, transparent);}.rail-item.hi.svelte-1lk0sb9 {background:var(--color-primary);color:#fff;transform:scale(1.18);z-index:2;}.rail-flag.svelte-1lk0sb9 {position:absolute;top:50%;transform:translateY(-50%) skewY(12deg);white-space:nowrap;background:var(--color-primary);color:#fff;padding:5px 12px;border-radius:2px;font-size:0.9rem;font-weight:700;box-shadow:var(--shadow);}.rail-zone[data-side=\'right\'].svelte-1lk0sb9 .rail-flag:where(.svelte-1lk0sb9) {right:58px;}.rail-zone[data-side=\'left\'].svelte-1lk0sb9 .rail-flag:where(.svelte-1lk0sb9) {left:58px;}.sub-backdrop.svelte-1lk0sb9 {position:absolute;inset:0;z-index:24;}\n\n  /* ---- Sub-rail flyout (color = rainbow, sort = labels), also a parallelogram ---- */.subrail.svelte-1lk0sb9 {position:absolute;top:50%;z-index:27;display:flex;flex-direction:column;gap:4px;padding:10px 7px;background:color-mix(in srgb, var(--color-surface) 88%, transparent);backdrop-filter:blur(16px);box-shadow:var(--shadow);}.subrail[data-side=\'right\'].svelte-1lk0sb9 {right:64px;transform:translateY(-50%) skewY(-12deg);}.subrail[data-side=\'left\'].svelte-1lk0sb9 {left:64px;transform:translateY(-50%) skewY(-12deg);}\n  /* colour flyout: no bar background — the colour slices float freely */.subrail.color.svelte-1lk0sb9 {gap:3px;padding:0;background:transparent;backdrop-filter:none;box-shadow:none;}.subrail.color.svelte-1lk0sb9 .sub-item:where(.svelte-1lk0sb9) {box-shadow:0 2px 8px rgba(0, 0, 0, 0.35);}.sub-item.svelte-1lk0sb9 {display:flex;align-items:center;justify-content:center;min-width:130px;padding:8px 12px;border-radius:2px;color:var(--text-muted);}.sub-item.svelte-1lk0sb9 > * {transform:skewY(12deg);}.sub-label.svelte-1lk0sb9 {font-size:0.85rem;white-space:nowrap;}\n  /* colour items: full-colour parallelogram slices, no label — a rainbow strip */.sub-item.color.svelte-1lk0sb9 {min-width:52px;width:52px;height:24px;padding:0;border-radius:0;background:var(--sw);}.sub-item.color.on.svelte-1lk0sb9 {box-shadow:inset 0 0 0 3px #fff, inset 0 0 0 5px rgba(0, 0, 0, 0.4);}.sub-item:not(.color).on.svelte-1lk0sb9 {background:color-mix(in srgb, var(--color-primary) 24%, transparent);color:var(--text);}.sub-item.hi.svelte-1lk0sb9 {transform:scale(1.14);z-index:3;}.sub-item.color.hi.svelte-1lk0sb9 {box-shadow:inset 0 0 0 3px #fff;}\n\n  /* ---- Sub-panels (search / color / sort / modes) ---- */.panel-backdrop.svelte-1lk0sb9 {position:absolute;inset:0;z-index:28;background:rgba(0, 0, 0, 0.25);}.side-panel.svelte-1lk0sb9 {position:absolute;z-index:29;top:50%;transform:translateY(-50%);width:min(260px, 72vw);max-height:80%;overflow-y:auto;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);}.side-panel[data-side=\'right\'].svelte-1lk0sb9 {right:68px;}.side-panel[data-side=\'left\'].svelte-1lk0sb9 {left:68px;}\n  /* Docked (alwaysSearchBar): compact top bar, no backdrop, gallery stays tappable. */.side-panel.docked[data-side=\'right\'].svelte-1lk0sb9,\n  .side-panel.docked[data-side=\'left\'].svelte-1lk0sb9 {top:12px;left:50%;right:auto;transform:translateX(-50%);width:min(86%, 420px);max-height:46%;}.sp-head.svelte-1lk0sb9 {display:flex;align-items:center;gap:8px;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);}.sp-off.svelte-1lk0sb9 {margin-left:auto;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--border);border-radius:999px;background:var(--bg);color:var(--text-muted);font-size:1.1rem;line-height:1;}.sp-input.svelte-1lk0sb9 {padding:var(--space-3);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.95rem;outline:none;}.sp-taglabel.svelte-1lk0sb9 {font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);}.sp-tags.svelte-1lk0sb9 {display:flex;flex-wrap:wrap;gap:6px;}.sp-tag.svelte-1lk0sb9 {padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:0.8rem;white-space:nowrap;}.sp-tag.on.svelte-1lk0sb9 {background:var(--color-primary);color:#fff;border-color:transparent;}.sp-clear.svelte-1lk0sb9 {padding:var(--space-2);background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-muted);font-size:0.82rem;}\n\n  /* ---- Collections bar ---- */.coll-bar.svelte-1lk0sb9 {position:sticky;top:0;z-index:10;display:flex;gap:6px;flex-wrap:wrap;padding:4px 2px 10px;margin-bottom:4px;background:linear-gradient(var(--view-bg, var(--bg-elevated)) 70%, transparent);}.coll-chip.svelte-1lk0sb9 {display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:0.82rem;white-space:nowrap;}.coll-chip.on.svelte-1lk0sb9 {background:var(--color-primary);color:#fff;border-color:transparent;}.coll-chip.sm.svelte-1lk0sb9 {padding:4px 10px;font-size:0.78rem;}.coll-count.svelte-1lk0sb9 {font-size:0.7rem;opacity:0.7;}.coll-add.svelte-1lk0sb9 {width:30px;height:30px;border-radius:50%;border:1px dashed var(--border);background:transparent;color:var(--text-muted);font-size:1rem;line-height:1;}.coll-add.sm.svelte-1lk0sb9 {width:auto;height:auto;border-radius:999px;padding:4px 10px;font-size:0.78rem;}.coll-new.svelte-1lk0sb9 {padding:4px 10px;background:var(--bg);border:1px solid var(--color-primary);border-radius:999px;color:var(--text);font-size:0.8rem;outline:none;width:120px;}.coll-chiprow.svelte-1lk0sb9 {display:flex;flex-wrap:wrap;gap:6px;}\n\n  /* ---- Fullscreen settings window ---- */.settings-full.svelte-1lk0sb9 {position:absolute;inset:0;z-index:46;background:var(--bg);display:flex;flex-direction:column;}\n  /* Shell already pads for the top safe-area; this overlay sits below the tab bar,\n     so use a tight top padding (no second safe-area inset) to reclaim space. */.settings-head.svelte-1lk0sb9 {display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border);font-weight:700;font-size:1.05rem;}.settings-body.svelte-1lk0sb9 {flex:1;overflow-y:auto;padding:var(--space-4);max-width:640px;margin:0 auto;width:100%;}\n\n  /* ---- Add overlay (upload + Wallhaven) ---- */.add-tabs.svelte-1lk0sb9 {display:flex;gap:var(--space-2);padding:var(--space-3) var(--space-4) 0;max-width:640px;margin:0 auto;width:100%;}.add-tabs.svelte-1lk0sb9 button:where(.svelte-1lk0sb9) {flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-muted);font-size:0.9rem;}.add-tabs.svelte-1lk0sb9 button.on:where(.svelte-1lk0sb9) {background:var(--color-primary);color:#fff;border-color:transparent;}.add-upload.svelte-1lk0sb9 {display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);min-height:180px;border:2px dashed var(--border);border-radius:var(--radius-lg);color:var(--text-muted);cursor:pointer;}.wh-search.svelte-1lk0sb9 {display:flex;gap:var(--space-2);margin-bottom:var(--space-3);}.wh-search.svelte-1lk0sb9 input:where(.svelte-1lk0sb9) {flex:1;padding:var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.95rem;outline:none;}.wh-search.svelte-1lk0sb9 button:where(.svelte-1lk0sb9) {padding:0 var(--space-4);background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);}.wh-filter-btn.svelte-1lk0sb9 {background:var(--bg-elevated) !important;border:1px solid var(--border) !important;color:var(--text-muted) !important;}.wh-filter-btn.on.svelte-1lk0sb9 {background:var(--color-primary) !important;color:#fff !important;border-color:transparent !important;}.wh-error.svelte-1lk0sb9 {color:#e5484d;font-size:0.85rem;}.wh-info.svelte-1lk0sb9 {color:var(--text-faint);font-size:0.9rem;text-align:center;padding:var(--space-4);}.wh-head.svelte-1lk0sb9 {max-width:640px;margin:0 auto;width:100%;padding:var(--space-3) var(--space-4) var(--space-2);display:flex;flex-direction:column;gap:var(--space-2);}.wh-filters.svelte-1lk0sb9 {display:flex;flex-wrap:wrap;gap:6px;align-items:center;}.wh-chip.svelte-1lk0sb9 {padding:5px 12px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);font-size:0.8rem;border-radius:2px;transform:skewX(-11deg);}.wh-chip.svelte-1lk0sb9 > * {display:inline-block;transform:skewX(11deg);}.wh-chip.on.svelte-1lk0sb9 {background:var(--color-primary);color:#fff;border-color:transparent;}.wh-sep.svelte-1lk0sb9 {width:1px;align-self:stretch;background:var(--border);margin:0 4px;}.wh-scroll.svelte-1lk0sb9 {flex:1;overflow-y:auto;padding:var(--space-2) var(--space-4) var(--space-5);max-width:640px;margin:0 auto;width:100%;}.wh-grid.svelte-1lk0sb9 {display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:var(--space-2);}.wh-tile.svelte-1lk0sb9 {aspect-ratio:16 / 10;border-radius:var(--radius-md);border:1px solid var(--border);background-size:cover;background-position:center;position:relative;cursor:pointer;padding:0;}.wh-res.svelte-1lk0sb9 {position:absolute;right:5px;bottom:5px;background:rgba(0,0,0,0.6);color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:4px;}\n\n  /* Wallhaven fullscreen preview */.wh-preview.svelte-1lk0sb9 {position:absolute;inset:0;z-index:70;background:#000;display:flex;flex-direction:column;}.wh-preview-img.svelte-1lk0sb9 {flex:1;background-size:contain;background-position:center;background-repeat:no-repeat;}.wh-preview-meta.svelte-1lk0sb9 {color:#fff;font-size:0.85rem;opacity:0.8;}.icon-btn.svelte-1lk0sb9 {background:transparent;border:none;color:var(--text-muted);padding:6px;border-radius:var(--radius-sm);}.icon-btn.svelte-1lk0sb9:hover {background:var(--bg-hover);color:var(--text);}\n\n  /* ---- Fullscreen system-wallpaper preview ---- */.syswp.svelte-1lk0sb9 {position:absolute;inset:0;z-index:50;background-color:#000;background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:space-between;}.syswp-top.svelte-1lk0sb9 {display:flex;align-items:flex-start;justify-content:flex-start;padding:max(var(--space-4), env(safe-area-inset-top)) var(--space-4) var(--space-4);background:linear-gradient(rgba(0, 0, 0, 0.5), transparent);}.syswp-x.svelte-1lk0sb9 {background:rgba(0, 0, 0, 0.4);border:none;color:#fff;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;backdrop-filter:blur(6px);}.syswp-bottom.svelte-1lk0sb9 {display:flex;flex-direction:column;align-items:center;gap:var(--space-3);padding:var(--space-5) var(--space-4) max(var(--space-5), env(safe-area-inset-bottom));background:linear-gradient(transparent, rgba(0, 0, 0, 0.65));}.syswp-checks.svelte-1lk0sb9 {display:flex;gap:var(--space-2);flex-wrap:wrap;justify-content:center;}.syswp-chip.svelte-1lk0sb9 {display:flex;align-items:center;gap:8px;padding:var(--space-2) var(--space-4);background:rgba(255, 255, 255, 0.15);border:1px solid rgba(255, 255, 255, 0.3);color:#fff;font-size:0.9rem;border-radius:999px;backdrop-filter:blur(6px);}.syswp-chip.on.svelte-1lk0sb9 {background:var(--color-primary);border-color:transparent;font-weight:600;}.syswp-msg.svelte-1lk0sb9 {color:#fff;font-size:0.9rem;text-shadow:0 1px 3px rgba(0, 0, 0, 0.6);}.syswp-set.svelte-1lk0sb9 {width:min(100%, 360px);padding:var(--space-4);background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-lg);font-size:1.05rem;font-weight:700;}.syswp-set.svelte-1lk0sb9:disabled {opacity:0.6;}\n\n  /* ---- Long-press flip-card detail ---- */.detail-overlay.svelte-1lk0sb9 {position:absolute;inset:0;z-index:60;background:rgba(0, 0, 0, 0.72);backdrop-filter:blur(4px);display:grid;place-items:center;padding:var(--space-5);\n    animation: svelte-1lk0sb9-detail-in 160ms ease;}\n  @keyframes svelte-1lk0sb9-detail-in { from { opacity: 0; } to { opacity: 1; } }.flip-card.svelte-1lk0sb9 {width:min(340px, 82%);aspect-ratio:3 / 4;perspective:1400px;}.flip-inner.svelte-1lk0sb9 {position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform 520ms cubic-bezier(0.4, 0, 0.2, 1);}.flip-card.flipped.svelte-1lk0sb9 .flip-inner:where(.svelte-1lk0sb9) {transform:rotateY(180deg);}.flip-front.svelte-1lk0sb9, .flip-back.svelte-1lk0sb9 {position:absolute;inset:0;border-radius:var(--radius-lg);backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 20px 60px rgba(0, 0, 0, 0.5);}.flip-front.svelte-1lk0sb9 {background-size:cover;background-position:center;background-color:var(--color-surface-variant);}.flip-back.svelte-1lk0sb9 {transform:rotateY(180deg);background:var(--bg-elevated);border:1px solid var(--border);padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4);justify-content:center;}.fav-big.svelte-1lk0sb9 {display:flex;flex-direction:column;align-items:center;gap:6px;padding:var(--space-4);background:var(--bg-hover);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-muted);font-size:0.85rem;}.fav-big.on.svelte-1lk0sb9 {background:color-mix(in srgb, #ff5d8f 20%, transparent);color:#ff5d8f;border-color:#ff5d8f66;}.tag-field.svelte-1lk0sb9 {display:flex;flex-direction:column;gap:6px;}.tf-label.svelte-1lk0sb9 {font-size:0.8rem;color:var(--text-muted);}.tag-list.svelte-1lk0sb9 {display:flex;flex-wrap:wrap;gap:5px;min-height:8px;}.tag-chip.svelte-1lk0sb9 {display:inline-flex;align-items:center;gap:4px;background:color-mix(in srgb, var(--color-primary) 22%, transparent);color:var(--text);border-radius:999px;padding:3px 6px 3px 10px;font-size:0.8rem;}.tag-chip.svelte-1lk0sb9 button:where(.svelte-1lk0sb9) {background:transparent;border:none;color:inherit;font-size:1.1em;line-height:1;padding:0 2px;cursor:pointer;}.tag-empty.svelte-1lk0sb9 {font-size:0.8rem;color:var(--text-faint);}.tag-input.svelte-1lk0sb9 {padding:var(--space-3);background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.95rem;}.detail-actions.svelte-1lk0sb9 {display:flex;gap:var(--space-2);}.detail-actions.svelte-1lk0sb9 button:where(.svelte-1lk0sb9) {flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:var(--space-3);border-radius:var(--radius-md);font-size:0.9rem;font-weight:600;border:none;}.del-big.svelte-1lk0sb9 {background:color-mix(in srgb, #e5484d 18%, transparent);color:#e5484d;}.done-big.svelte-1lk0sb9 {background:var(--color-primary);color:#fff;}.fx-big.svelte-1lk0sb9 {background:var(--bg-hover);color:var(--text);}.done-big.wide.svelte-1lk0sb9 {width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:var(--space-3);border-radius:var(--radius-md);font-weight:600;border:none;}.fx-chips.svelte-1lk0sb9 {display:flex;gap:6px;overflow-x:auto;max-width:100%;padding-bottom:2px;}.fx-chip.svelte-1lk0sb9 {flex:0 0 auto;padding:var(--space-2) var(--space-4);background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:0.85rem;border-radius:999px;backdrop-filter:blur(6px);}.fx-chip.on.svelte-1lk0sb9 {background:var(--color-primary);border-color:transparent;font-weight:600;}\n\n  @media (max-width: 640px) {.picker.pinned[data-side=\'right\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9) {padding-right:var(--space-4);}.picker.pinned[data-side=\'left\'].svelte-1lk0sb9 .gallery-scroll:where(.svelte-1lk0sb9) {padding-left:var(--space-4);}[data-mode=\'wall\'].svelte-1lk0sb9 .gallery:where(.svelte-1lk0sb9) {grid-template-columns:repeat(auto-fill, minmax(100px, 1fr));}\n  }'
};

function Picker($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$1);

	const // System-wallpaper capability present only inside the native app.
	// Full resolution for the real wallpaper (the gallery shows thumbnails).
	// ---- Filters & sorting ----
	// All tags in use, for the filter chip bar.
	// Active collection (playlist) narrows the gallery to its members.
	// Wallpaper Engine items can't exist here
	// Tag chips: item must carry ALL selected tags (narrowing filter).
	// Base order is oldest→newest (insertion). Build from there.
	/* already oldest-first */
	// newest first…
	// …favorites on top (stable)
	// ---- Collections (playlists) ----
	// Flip-card: create a collection and drop the current image into it.
	// ---- Long-press → flip-card detail (favorite / tags / effect / delete) ----
	// ---- Photo effects ----
	/* keep previous preview */
	/* ignore */
	// Lazy-load folder-backed thumbnails as they scroll into view (bounds native
	// SAF reads to what's actually on screen).
	// Free the (full-res, folder-backed) image shortly after it leaves
	// the viewport so memory stays bounded while scrolling a big folder.
	// Wall grid: fixed columns if set, else auto-fit by tile size.
	// ---- Honeycomb geometry (geometric mode) — VERTICAL arc scroller (SKWD-style) ----
	// Fixed number of columns across the width; items fill row by row and the
	// honeycomb scrolls up/down. With "Arc" on, tiles curve and fade at top/bottom.
	// -1..1 across viewport (vertical)
	// SKWD arc curve (cross-axis offset ∝ normalized²) — flipped to horizontal for vertical scroll.
	// Edge shrink + fade begin at `fs` (adjustable) and reach their max at the edge.
	// ---- Centred-stage views (Slices / Depth / Sandy / Hand / Collection) ----
	// Faithful 2D adaptation of SKWD: the ACTIVE item is the camera centre; every
	// tile is positioned by its signed distance d = index − activeIndex and the
	// stage animates via CSS transitions when the active item changes.
	// Browse cursor for the centred stages: wheel/drag flips through the items
	// (cursor moves), tapping a tile selects it. The cursor follows the active
	// selection whenever that changes externally (tap, auto-rotate, mode switch).
	// Drag up (content scrolls up) → advance; drag down → go back.
	// A browse-drag just happened — swallow the trailing click so it doesn't select.
	// All centred views arrange along the VERTICAL axis (phone is held upright):
	// the current item sits at the centre, neighbours stack above/below and the
	// motion on re-select reads top↔bottom. z-index stays well under the rail
	// (25); the .stage forms its own stacking context so it can never cover it.
	// SLICES — vertical filmstrip; the current item expands to a tall wide panel,
	// neighbours become thin bands above/below, opacity fades top & bottom.
	// DEPTH — vertical log-depth stack; cards shrink and ease outward (ln falloff)
	// above and below the big current card in the middle.
	// SANDY — big hero (current) in the centre + a vertical thumbnail column on
	// the edge opposite the rail, centred on the current item with top/bottom fade.
	// Column hugs the edge opposite the swipe rail.
	// HAND — card fan centred on the current card, fanning VERTICALLY: cards step
	// top→bottom, bow out sideways, and the current card lifts forward.
	// sideways bow
	// COLLECTION — vertical tilted deck; the current card sits big & upright in
	// front, the rest recede below as a shrinking, tilted stack.
	// ---- Vertical swipe-select rail (SKWD-style, right/left edge) ----
	// Order follows SKWD's horizontal bar (left→right ⇒ top→bottom); settings last.
	// `sub: true` → opens a second swipe-rail (flyout) next to the main one.
	// Hide phone-only items when the Handy device is off, and hide the static
	// "set as system wallpaper" when the live wallpaper is on (it would replace
	// the live wallpaper with a static image and break the live rotation).
	// --- Add overlay (upload + Wallhaven) ---
	// keep at least one
	// Sub-rail (flyout) state for color / sort.
	// Note: an open sub-flyout (subFor) must NOT block hiding — otherwise a
	// sticky flyout keeps the whole rail open forever. The timeout closes both.
	// Finger is off the rail/flyout entirely → clear the pending selection, so
	// releasing out here cancels instead of firing the last-highlighted item.
	// Toggle the flyout: keep it open so you can also tap a value.
	// Toggle: swiping the active colour again removes the filter (like SKWD).
	// reshuffle each pick
	// ignore the click that trails a browse-drag
	// "Close on selection": collapse the rail/panels right after picking.
	tileInner = ($$anchor, item = noop) => {
		var fragment = root_5$1();
		var node_1 = first_child(fragment);

		{
			var consequent_1 = ($$anchor) => {
				var fragment_1 = root_1$1();
				var node_2 = first_child(fragment_1);

				{
					var consequent = ($$anchor) => {
						var video = root$1();

						video.muted = true;
						template_effect(() => set_attribute(video, 'src', urls.value[item().id] + '#t=0.1'));
						append($$anchor, video);
					};

					if_block(node_2, ($$render) => {
						if (urls.value[item().id]) $$render(consequent);
					});
				}
				append($$anchor, fragment_1);
			};

			if_block(node_1, ($$render) => {
				if (item().kind === 'video') $$render(consequent_1);
			});
		}

		var node_3 = sibling(node_1, 2);

		{
			var consequent_2 = ($$anchor) => {
				var span_1 = root_2$1();
				var node_4 = child(span_1);

				Icon(node_4, { name: 'check', size: 14 });
				append($$anchor, span_1);
			};

			if_block(node_3, ($$render) => {
				if (item().id === get(activeId)) $$render(consequent_2);
			});
		}

		var node_5 = sibling(node_3, 2);

		{
			var consequent_3 = ($$anchor) => {
				var span_2 = root_3$1();
				var node_6 = child(span_2);

				Icon(node_6, { name: 'heart', size: 13 });
				append($$anchor, span_2);
			};

			if_block(node_5, ($$render) => {
				if (item().favorite) $$render(consequent_3);
			});
		}

		var node_7 = sibling(node_5, 2);

		{
			var consequent_4 = ($$anchor) => {
				var span_3 = root_4$1();
				var text = only_child(span_3, true);

				template_effect(() => set_text(text, item().name));
				append($$anchor, span_3);
			};

			if_block(node_7, ($$render) => {
				if (get(mode) !== 'geometric' && get(mode) !== 'hand') $$render(consequent_4);
			});
		}

		append($$anchor, fragment);
	};

	const wpState = useStore($$props.manager.state);
	const urls = useStore($$props.manager.urls);
	const themeMode = useStore($$props.app.theme.mode);

	let themeIcon = user_derived(() => themeMode.value === 'light'
		? 'sun'
		: themeMode.value === 'dark' ? 'moon' : 'theme-auto');

	function cycleTheme() {
		const order = ['auto', 'light', 'dark'];
		const cur = $$props.app.theme.mode.get();

		$$props.app.theme.setMode(order[(order.indexOf(cur) + 1) % order.length]);
	}

	let railVisible = state(false);
	let scrubbing = state(false);
	let highlightedRail = state(null);
	let activePanel = state(null);
	let uploading = state(false);
	let galleryWidth = state(0);
	let galleryHeight = state(0);
	let settingsOpen = state(false);
	let applying = state(false);
	let applyMsg = state('');
	let sysWpOpen = state(false);

	// System-wallpaper capability present only inside the native app.
	const native = $$props.app.capabilities.has('wallpaper');

	let setHome = user_derived(() => wpState.value.setHome);
	let setLock = user_derived(() => wpState.value.setLock);

	async function setAsSystem() {
		if (!get(activeId)) return;

		const target = get(setHome) && get(setLock)
			? 'both'
			: get(setHome) ? 'home' : get(setLock) ? 'lock' : null;

		if (!target) {
			set(applyMsg, 'Mind. ein Ziel wählen');
			setTimeout(() => set(applyMsg, ''), 2500);

			return;
		}

		// Full resolution for the real wallpaper (the gallery shows thumbnails).
		const url = await $$props.manager.fullUrl(get(activeId));

		if (!url) return;

		set(applying, true);
		set(applyMsg, '');
		cancelHide();

		try {
			await $$props.app.capabilities.get('wallpaper')?.setSystem(url, target);
			set(applyMsg, 'Als Hintergrund gesetzt ✓');
		} catch(e) {
			set(applyMsg, 'Fehler: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			URL.revokeObjectURL(url);
		}

		set(applying, false);

		if (get(applyMsg).startsWith('Gesetzt') || get(applyMsg).includes('✓')) {
			setTimeout(
				() => {
					set(applyMsg, '');
					set(sysWpOpen, false);
				},
				1100
			);
		} else {
			setTimeout(() => set(applyMsg, ''), 3500);
		}
	}

	let side = user_derived(() => wpState.value.menuSide);
	let pinned = user_derived(() => wpState.value.menuMode === 'pinned');
	let mode = user_derived(() => wpState.value.viewMode);
	let allItems = user_derived(() => wpState.value.items);
	let activeId = user_derived(() => wpState.value.activeId);
	let railShown = user_derived(() => get(pinned) || get(railVisible) || wpState.value.alwaysFilterBar);

	// ---- Filters & sorting ----
	let search = state('');

	let sortBy = state('newest');
	let shuffleSeed = state(1);
	let mediaTab = state('all');
	let favOnly = state(false);
	let colorKey = state(null);
	let selectedTags = state(proxy([]));

	// All tags in use, for the filter chip bar.
	let allTags = user_derived(() => {
		const set = new Set();

		for (const it of get(allItems)) for (const t of it.tags ?? []) set.add(t);

		return [...set].sort();
	});

	function toggleTag(t) {
		set(
			selectedTags,
			get(selectedTags).includes(t)
				? get(selectedTags).filter((x) => x !== t)
				: [...get(selectedTags), t],
			true
		);
	}

	// Active collection (playlist) narrows the gallery to its members.
	let activeCollection = user_derived(() => wpState.value.activeCollectionId
		? wpState.value.collections.find((c) => c.id === wpState.value.activeCollectionId) ?? null
		: null);

	let items = user_derived(() => {
		const q = get(search).trim().toLowerCase();
		const colIds = get(activeCollection) ? new Set(get(activeCollection).itemIds) : null;

		const list = get(allItems).filter((it) => {
			const k = it.kind ?? 'image';

			if (get(mediaTab) === 'image' && k !== 'image') return false;
			if (get(mediaTab) === 'video' && k !== 'video') return false;
			if (get(mediaTab // Wallpaper Engine items can't exist here
			) === 'we') return false;
			if (colIds && !colIds.has(it.id)) return false;
			if (get(favOnly) && !it.favorite) return false;
			if (get(colorKey) && colorFamily(it.accent) !== get(colorKey)) return false;

			// Tag chips: item must carry ALL selected tags (narrowing filter).
			if (get(selectedTags).length && !get(selectedTags).every((t) => (it.tags ?? []).includes(t))) return false;

			if (q && !it.name.toLowerCase().includes(q) && !(it.tags ?? []).some((t) => t.includes(q))) return false;

			return true;
		});

		// Base order is oldest→newest (insertion). Build from there.
		const sorted = [...list];

		if (get(sortBy) === 'newest') sorted.reverse(); else if (get(sortBy) === 'oldest') ; else if (get(sortBy) === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name)); else if (get(sortBy) === 'nameDesc') sorted.sort((a, b) => b.name.localeCompare(a.name)); else if (get(sortBy) === 'rainbow') sorted.sort((a, b) => rainbowKey(a.accent) - rainbowKey(b.accent)); else if (get(sortBy) === 'color') sorted.sort((a, b) => lightness(b.accent) - lightness(a.accent)); else if (get(sortBy) === 'colorDark') sorted.sort((a, b) => lightness(a.accent) - lightness(b.accent)); else if (get(sortBy) === 'favorites') {
			sorted.reverse(); // newest first…
			sorted.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)); // …favorites on top (stable)
		} else if (get(sortBy) === 'shuffle') {
			const h = (s) => {
				let x = get(shuffleSeed);

				for (let i = 0; i < s.length; i++) x = x * 31 + s.charCodeAt(i) >>> 0;

				return x;
			};

			sorted.sort((a, b) => h(a.id) - h(b.id));
		}

		return sorted;
	});

	let filtersActive = user_derived(() => get(favOnly) || get(colorKey) !== null || get(search).trim() !== '' || get(selectedTags).length > 0);

	function clearFilters() {
		set(favOnly, false);
		set(colorKey, null);
		set(search, '');
		set(selectedTags, [], true);

		if (wpState.value.activeCollectionId) $$props.manager.setActiveCollection(null);
	}

	// ---- Collections (playlists) ----
	let collections = user_derived(() => wpState.value.collections);

	let activeCollectionId = user_derived(() => wpState.value.activeCollectionId);
	let collBarCreating = state(false);
	let newCollName = state('');

	function createCollectionFromBar() {
		const name = get(newCollName).trim();

		set(newCollName, '');
		set(collBarCreating, false);

		if (!name) return;

		const id = $$props.manager.createCollection(name);

		$$props.manager.setActiveCollection(id);
	}

	// Flip-card: create a collection and drop the current image into it.
	let detailCollCreating = state(false);

	let detailNewColl = state('');

	function createCollForDetail() {
		const name = get(detailNewColl).trim();
		const item = get(detailItem);

		set(detailNewColl, '');
		set(detailCollCreating, false);

		if (!name || !item) return;

		const id = $$props.manager.createCollection(name);

		$$props.manager.toggleInCollection(id, item.id);
	}

	// ---- Long-press → flip-card detail (favorite / tags / effect / delete) ----
	let detailItem = state(null);

	let flipped = state(false);
	let tagInput = state('');

	let detailData = user_derived(() => get(detailItem)
		? get(allItems).find((i) => i.id === get(detailItem).id)
		: undefined);

	let detailFav = user_derived(() => get(detailData)?.favorite ?? false);
	let detailTags = user_derived(() => get(detailData)?.tags ?? []);

	function openDetail(item) {
		set(detailItem, item, true);
		set(tagInput, '');
		set(flipped, false);
		cancelHide();
		setTimeout(() => set(flipped, true), 40);
	}

	function closeDetail() {
		set(flipped, false);
		setTimeout(() => set(detailItem, null), 220);
	}

	function commitTag() {
		if (!get(detailItem)) return;

		const parts = get(tagInput).split(',').map((t) => t.trim()).filter(Boolean);

		for (const p of parts) $$props.manager.addTag(get(detailItem).id, p);

		set(tagInput, '');
	}

	function deleteFromDetail() {
		if (!get(detailItem)) return;

		const id = get(detailItem).id;

		set(flipped, false);
		set(detailItem, null);
		void $$props.manager.removeImage(id);
	}

	// ---- Photo effects ----
	let effectItem = state(null);

	let effectType = state('none');
	let effectPreview = state(null);
	let effectBusy = state(false);

	function paletteHex() {
		const p = $$props.app.theme.palette.get();

		return [
			p.primary,
			p.secondary,
			p.tertiary,
			p.surface,
			p.surfaceVariant,
			p.outline,
			p.onSurface,
			'#000000',
			'#ffffff'
		];
	}

	function openEffects(item) {
		closeDetail();
		set(effectItem, item, true);
		set(effectType, 'none');

		if (get(effectPreview)) URL.revokeObjectURL(get(effectPreview));

		set(effectPreview, urls.value[item.id] ?? null, true);
	}

	function closeEffects() {
		if (get(effectPreview) && get(effectType) !== 'none') URL.revokeObjectURL(get(effectPreview));

		set(effectPreview, null);
		set(effectItem, null);
	}

	async function selectEffect(e) {
		if (!get(effectItem)) return;

		set(effectType, e, true);

		const src = urls.value[get(effectItem).id];

		if (!src) return;

		if (e === 'none') {
			set(effectPreview, src, true);

			return;
		}

		set(effectBusy, true);

		try {
			const blob = await applyEffect(src, e, paletteHex());

			if (get(effectPreview) && get(effectPreview) !== src) URL.revokeObjectURL(get(effectPreview));

			set(effectPreview, URL.createObjectURL(blob), true);
		} catch {
			/* keep previous preview */
		}

		set(effectBusy, false);
	}

	async function saveEffect() {
		if (!get(effectItem) || get(effectType) === 'none') return;

		const src = urls.value[get(effectItem).id];

		if (!src) return;

		set(effectBusy, true);

		try {
			const blob = await applyEffect(src, get(effectType), paletteHex());
			const name = `${get(effectItem).name} · ${EFFECTS.find((x) => x.value === get(effectType))?.label ?? ''}`.trim();
			const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });

			await $$props.manager.addImage(file);
			closeEffects();
		} catch {
			/* ignore */
		}

		set(effectBusy, false);
	}

	// Lazy-load folder-backed thumbnails as they scroll into view (bounds native
	// SAF reads to what's actually on screen).
	function ensure(node, id) {
		let currentId = id;
		let releaseTimer = null;

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						if (releaseTimer) {
							clearTimeout(releaseTimer);
							releaseTimer = null;
						}

						void $$props.manager.ensureUrl(currentId);
					} else {
						// Free the (full-res, folder-backed) image shortly after it leaves
						// the viewport so memory stays bounded while scrolling a big folder.
						releaseTimer = setTimeout(() => $$props.manager.releaseUrl(currentId), 1500);
					}
				}
			},
			{ rootMargin: '250px' }
		);

		io.observe(node);

		return {
			update(nid) {
				currentId = nid;
				void $$props.manager.ensureUrl(nid);
			},

			destroy() {
				if (releaseTimer) clearTimeout(releaseTimer);

				io.disconnect();
			}
		};
	}

	function longpress(node, opts) {
		let current = opts;
		let timer = null;
		let fired = false;
		let sx = 0;
		let sy = 0;

		const clear = () => {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		};

		const down = (e) => {
			fired = false;
			sx = e.clientX;
			sy = e.clientY;

			timer = setTimeout(
				() => {
					fired = true;
					current.onLong();
				},
				480
			);
		};

		const move = (e) => {
			if (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12) clear();
		};

		const click = (e) => {
			if (fired) {
				e.preventDefault();
				e.stopPropagation();
				fired = false;

				return;
			}

			current.onTap();
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', clear);
		node.addEventListener('pointercancel', clear);
		node.addEventListener('pointerleave', clear);
		node.addEventListener('click', click);

		return {
			update(o) {
				current = o;
			},

			destroy() {
				clear();
				node.removeEventListener('pointerdown', down);
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerup', clear);
				node.removeEventListener('pointercancel', clear);
				node.removeEventListener('pointerleave', clear);
				node.removeEventListener('click', click);
			}
		};
	}

	function bg(id) {
		const u = urls.value[id];

		return u ? `background-image:url(${u})` : '';
	}

	// Wall grid: fixed columns if set, else auto-fit by tile size.
	let wallGrid = user_derived(() => wpState.value.wallColumns > 0
		? `repeat(${wpState.value.wallColumns}, 1fr)`
		: 'repeat(auto-fill, minmax(var(--tile-size, 130px), 1fr))');

	// ---- Honeycomb geometry (geometric mode) — VERTICAL arc scroller (SKWD-style) ----
	// Fixed number of columns across the width; items fill row by row and the
	// honeycomb scrolls up/down. With "Arc" on, tiles curve and fade at top/bottom.
	let hexColCount = user_derived(() => Math.max(1, wpState.value.hexColumns));

	let hexW = user_derived(() => {
		if (wpState.value.hexSize > 0) return wpState.value.hexSize;

		return get(galleryWidth) > 0
			? Math.max(48, Math.floor(get(galleryWidth) / get(hexColCount)) - 4)
			: 100;
	});

	let hexH = user_derived(() => Math.round(get(hexW) * 1.1547));
	let hexStepX = user_derived(() => get(hexW) + 4);
	let hexVStep = user_derived(() => Math.round(get(hexH) * 0.75) + 4);
	let hexRowCount = user_derived(() => Math.ceil(get(items).length / get(hexColCount)));
	let hexWrapW = user_derived(() => get(hexColCount) * get(hexStepX) + get(hexStepX) / 2);
	let hexWrapH = user_derived(() => get(hexRowCount) * get(hexVStep) + get(hexH) + 8);
	let hexScrollTop = state(0);

	function hexBase(i) {
		const row = Math.floor(i / get(hexColCount));
		const col = i % get(hexColCount);

		return {
			x: col * get(hexStepX) + (row % 2 ? get(hexStepX) / 2 : 0),
			y: row * get(hexVStep)
		};
	}

	const smoothstep = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

	function hexStyle(i) {
		const b = hexBase(i);
		let tx = 0;
		let sc = 1;
		let op = 1;

		if (wpState.value.hexArc && get(galleryHeight) > 0) {
			const centerY = get(hexScrollTop) + get(galleryHeight) / 2;
			const d = (b.y + get(hexH // -1..1 across viewport (vertical)
			) / 2 - centerY) / (get(galleryHeight) / 2);
			const ad = Math.abs(d);

			// SKWD arc curve (cross-axis offset ∝ normalized²) — flipped to horizontal for vertical scroll.
			tx = wpState.value.hexArcIntensity * 1.3 * (d * d);

			// Edge shrink + fade begin at `fs` (adjustable) and reach their max at the edge.
			const fs = Math.min(0.95, Math.max(0.3, wpState.value.hexFadeStart / 100));

			const span = Math.max(0.05, 1 - fs);

			sc = 1 - 0.2 * smoothstep((ad - fs) / span);
			op = ad > fs ? Math.max(0, 1 - (ad - fs) / span) : 1;
		}

		return `left:${b.x}px;top:${b.y}px;width:${get(hexW)}px;height:${get(hexH)}px;transform:translateX(${tx}px) scale(${sc});opacity:${op};`;
	}

	// ---- Centred-stage views (Slices / Depth / Sandy / Hand / Collection) ----
	// Faithful 2D adaptation of SKWD: the ACTIVE item is the camera centre; every
	// tile is positioned by its signed distance d = index − activeIndex and the
	// stage animates via CSS transitions when the active item changes.
	let activeIndex = user_derived(() => {
		const idx = get(items).findIndex((it) => it.id === get(activeId));

		return idx < 0 ? 0 : idx;
	});

	let cx = user_derived(() => get(galleryWidth) / 2);
	let cy = user_derived(() => get(galleryHeight) / 2);

	// Browse cursor for the centred stages: wheel/drag flips through the items
	// (cursor moves), tapping a tile selects it. The cursor follows the active
	// selection whenever that changes externally (tap, auto-rotate, mode switch).
	let centerIndex = state(0);

	user_effect(() => {
		set(centerIndex, get(activeIndex), true);
	});

	function stepCenter(delta) {
		const n = get(items).length;

		if (!n) return;

		set(centerIndex, Math.max(0, Math.min(n - 1, get(centerIndex) + delta)), true);
	}

	function onStageWheel(e) {
		e.preventDefault();
		stepCenter(e.deltaY > 0 ? 1 : -1);
	}

	const DRAG_STEP_PX = 52;
	let dragging = false;
	let dragLastY = 0;
	let dragAcc = 0;
	let dragMoved = false;
	let suppressTap = false;

	function onStagePointerDown(e) {
		dragging = true;
		dragLastY = e.clientY;
		dragAcc = 0;
		dragMoved = false;
	}

	function onStagePointerMove(e) {
		if (!dragging) return;

		dragAcc += e.clientY - dragLastY;
		dragLastY = e.clientY;

		// Drag up (content scrolls up) → advance; drag down → go back.
		while (dragAcc <= -DRAG_STEP_PX) {
			stepCenter(1);
			dragAcc += DRAG_STEP_PX;
			dragMoved = true;
		}

		while (dragAcc >= DRAG_STEP_PX) {
			stepCenter(-1);
			dragAcc -= DRAG_STEP_PX;
			dragMoved = true;
		}
	}

	function onStagePointerUp() {
		dragging = false;

		if (dragMoved) {
			// A browse-drag just happened — swallow the trailing click so it doesn't select.
			suppressTap = true;

			setTimeout(() => suppressTap = false, 60);
		}

		dragMoved = false;
	}

	// All centred views arrange along the VERTICAL axis (phone is held upright):
	// the current item sits at the centre, neighbours stack above/below and the
	// motion on re-select reads top↔bottom. z-index stays well under the rail
	// (25); the .stage forms its own stacking context so it can never cover it.
	// SLICES — vertical filmstrip; the current item expands to a tall wide panel,
	// neighbours become thin bands above/below, opacity fades top & bottom.
	const SLICE_H = 46;

	const SLICE_GAP = 8;
	let sliceW = user_derived(() => Math.min(Math.max(get(galleryWidth) * 0.82, 180), 520));
	let sliceExpandedH = user_derived(() => Math.min(Math.max(get(galleryHeight) * 0.42, 150), 360));

	function slicesTf(i) {
		const d = i - get(centerIndex);
		const stride = SLICE_H + SLICE_GAP;
		const h = d === 0 ? get(sliceExpandedH) : SLICE_H;
		let center;

		if (d === 0) center = 0; else if (d > 0) center = get(sliceExpandedH) / 2 + SLICE_GAP + (d - 1) * stride + SLICE_H / 2; else center = -(get(sliceExpandedH) / 2 + SLICE_GAP + (-d - 1) * stride + SLICE_H / 2);

		const half = Math.max(1, get(galleryHeight) / 2);
		const norm = Math.abs(center) / half;
		const fullZone = Math.min(0.6, (get(sliceExpandedH) / 2 + 2 * stride) / half);

		const op = norm <= fullZone
			? 1
			: Math.max(0, 1 - (norm - fullZone) / (1.2 - fullZone));

		const top = get(cy) + center - h / 2;
		const left = get(cx) - get(sliceW) / 2;

		return `left:${left}px;top:${top}px;width:${get(sliceW)}px;height:${h}px;opacity:${op};z-index:${20 - Math.abs(d)};`;
	}

	// DEPTH — vertical log-depth stack; cards shrink and ease outward (ln falloff)
	// above and below the big current card in the middle.
	const DEPTH_VISIBLE = 11;

	const DEPTH_FALLOFF = 0.55;

	const depthOffset = (d) => Math.sign(d) * (Math.log(1 + DEPTH_FALLOFF * Math.abs(d)) / DEPTH_FALLOFF);

	function depthTf(i) {
		const n = i - get(centerIndex);
		const radius = (DEPTH_VISIBLE - 1) / 2;
		const scale = 1 / (1 + DEPTH_FALLOFF * Math.abs(n));
		const baseW = Math.min(get(galleryWidth) * 0.64, 400);
		const baseH = Math.min(get(galleryHeight) * 0.4, 300);
		const spacing = baseH * 0.62;
		const natSpan = depthOffset(radius) * spacing + baseH / 2 || 1;
		const fit = Math.min((get(galleryHeight) / 2 - 36) / natSpan, get(galleryWidth) * 0.82 / baseW, 1);
		const w = baseW * fit * scale;
		const h = baseH * fit * scale;
		const centerY = depthOffset(n) * spacing * fit;
		const op = smoothstep(Math.max(0, Math.min(1, radius + 1 - Math.abs(n))));
		const left = get(cx) - w / 2;
		const top = get(cy) + centerY - h / 2;

		return `left:${left}px;top:${top}px;width:${w}px;height:${h}px;opacity:${op};z-index:${20 - Math.round(Math.abs(n) * 2)};`;
	}

	// SANDY — big hero (current) in the centre + a vertical thumbnail column on
	// the edge opposite the rail, centred on the current item with top/bottom fade.
	let sandyHeroW = user_derived(() => Math.min(get(galleryWidth) * 0.72, 460));

	let sandyHeroH = user_derived(() => Math.min(get(galleryHeight) * 0.6, 420));
	const SANDY_TW = 60;
	const SANDY_TH = 48;
	const SANDY_GAP = 8;

	function sandyStripTf(i) {
		const d = i - get(centerIndex);
		const stride = SANDY_TH + SANDY_GAP;
		const centerY = d * stride;
		const half = Math.max(1, get(galleryHeight) / 2);
		const fade = Math.max(0, Math.min(1, (half - Math.abs(centerY)) / (half * 0.55)));
		const sc = d === 0 ? 1.16 : 1;
		const w = SANDY_TW * sc;
		const h = SANDY_TH * sc;

		// Column hugs the edge opposite the swipe rail.
		const colX = wpState.value.sandySide === 'left'
			? 18 + SANDY_TW / 2
			: get(galleryWidth) - 18 - SANDY_TW / 2;

		const left = colX - w / 2;
		const top = get(cy) + centerY - h / 2;

		return `left:${left}px;top:${top}px;width:${w}px;height:${h}px;opacity:${fade};z-index:${20 - Math.abs(d)};`;
	}

	// HAND — card fan centred on the current card, fanning VERTICALLY: cards step
	// top→bottom, bow out sideways, and the current card lifts forward.
	function handTf(i) {
		const n = i - get(centerIndex);
		const an = Math.abs(n);
		const spreadY = Math.max(26, wpState.value.handSpread * 5);
		const y = n * spreadY;
		const x = Math.pow(an, 1.7) * 12; // sideways bow
		const roll = n * (wpState.value.handSpread * 0.5);
		const sc = (n === 0 ? 1.08 : 1) * (1700 / (1700 + an * 90));

		return `left:${get(cx) + wpState.value.handOffsetX}px;top:${get(cy)}px;transform:translate(-50%,-50%) translate(${x}px,${y}px) rotate(${roll}deg) scale(${sc});z-index:${20 - an};opacity:${an > 6 ? 0 : 1};`;
	}

	// COLLECTION — vertical tilted deck; the current card sits big & upright in
	// front, the rest recede below as a shrinking, tilted stack.
	function collTf(i) {
		const d = i - get(centerIndex);
		const ad = Math.abs(d);
		const size = Math.min(get(galleryHeight) * 0.5, get(galleryWidth) * 0.7, 420);
		const active = d === 0;
		const sc = active ? 1 : Math.max(0.45, 1 - ad * 0.1);
		const yOff = active ? -size * 0.06 : size * 0.12 + d * size * 0.055;
		const tilt = active ? 0 : -34;
		const z = active ? 30 : 20 - ad;
		const op = Math.max(0, Math.min(1, 6 - ad));
		const w = size;
		const h = size * 0.62;

		return `left:${get(cx)}px;top:${get(cy)}px;width:${w}px;height:${h}px;transform:translate(-50%,-50%) translateY(${yOff}px) rotateX(${tilt}deg) scale(${sc});z-index:${z};opacity:${op};`;
	}

	// ---- Vertical swipe-select rail (SKWD-style, right/left edge) ----
	// Order follows SKWD's horizontal bar (left→right ⇒ top→bottom); settings last.
	// `sub: true` → opens a second swipe-rail (flyout) next to the main one.
	const RAIL_ITEMS = [
		{ id: 'media', icon: 'film', label: 'Medien', sub: true },
		{ id: 'add', icon: 'plus', label: 'Hinzufügen' },
		{ id: 'favorites', icon: 'heart', label: 'Favoriten' },
		{ id: 'color', icon: 'palette', label: 'Farbe', sub: true },
		{ id: 'sort', icon: 'sort', label: 'Sortieren', sub: true },
		{ id: 'random', icon: 'sync', label: 'Zufall' },
		{ id: 'search', icon: 'search', label: 'Suche' },
		{ id: 'theme', icon: 'theme-auto', label: 'Hell/Dunkel' },
		...native
			? [{ id: 'syswp', icon: 'image', label: 'Als Hintergrund' }]
			: [],
		{ id: 'settings', icon: 'settings', label: 'Einstellungen' }
	];

	// Hide phone-only items when the Handy device is off, and hide the static
	// "set as system wallpaper" when the live wallpaper is on (it would replace
	// the live wallpaper with a static image and break the live rotation).
	let railItems = user_derived(() => RAIL_ITEMS.filter((it) => it.id !== 'syswp' || wpState.value.deviceMobile && !wpState.value.liveWallpaper));

	// --- Add overlay (upload + Wallhaven) ---
	let addOpen = state(false);

	let addTab = state('upload');
	const foldersSupported = $$props.app.capabilities.has('folders');
	let whFilters = proxy({ ...DEFAULT_WH_FILTERS });
	let whResults = state(proxy([]));
	let whPage = state(1);
	let whLastPage = state(1);
	let whLoading = state(false);
	let whError = state('');
	let whAdding = state(null);
	let whPreview = state(null);
	let whFiltersOpen = state(false);
	let whFiltersActive = user_derived(() => whFilters.sorting !== 'toplist' || whFilters.ratio !== 'all' || !whFilters.categories.every((c) => c));

	async function doSearch() {
		set(whLoading, true);
		set(whError, '');
		set(whPage, 1);

		try {
			const { results, lastPage } = await searchWallhaven(whFilters, 1);

			set(whResults, results, true);
			set(whLastPage, lastPage, true);
		} catch(e) {
			set(whError, e instanceof Error ? e.message : String(e), true);
			set(whResults, [], true);
		}

		set(whLoading, false);
	}

	async function loadMore() {
		if (get(whLoading) || get(whPage) >= get(whLastPage)) return;

		set(whLoading, true);

		try {
			const next = get(whPage) + 1;
			const { results, lastPage } = await searchWallhaven(whFilters, next);

			set(whResults, [...get(whResults), ...results], true);
			set(whPage, next);
			set(whLastPage, lastPage, true);
		} catch(e) {
			set(whError, e instanceof Error ? e.message : String(e), true);
		}

		set(whLoading, false);
	}

	function onWhScroll(e) {
		const el = e.target;

		if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) void loadMore();
	}

	function openWebTab() {
		set(addTab, 'web');

		if (get(whResults).length === 0 && !get(whLoading)) void doSearch();
	}

	function toggleCategory(i) {
		const c = [...whFilters.categories];

		c[i] = !c[i];

		if (!c[0] && !c[1] && !c[2]) c[i] = true; // keep at least one

		whFilters.categories = c;
		void doSearch();
	}

	async function addFromWeb(r) {
		set(whAdding, r.id, true);
		set(whError, '');

		try {
			const file = await downloadWallhaven(r);

			await $$props.manager.addImage(file);
			set(whPreview, null);
		} catch(e) {
			set(whError, 'Download fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)));
		}

		set(whAdding, null);
	}

	// Sub-rail (flyout) state for color / sort.
	let subFor = state(null);

	let subHighlight = state(null);

	let subItems = user_derived(() => {
		if (get(subFor) === 'color') return COLOR_FAMILIES.map((c) => ({ id: c.key, label: c.label, swatch: c.swatch }));
		if (get(subFor) === 'sort') return SORTS.map((s) => ({ id: s.value, label: s.label, swatch: '' }));
		if (get(subFor) === 'media') return MEDIA_TABS.filter((t) => t.value !== 'we' || $$props.app.platform.isDesktop).map((t) => ({ id: t.value, label: t.label, swatch: '' }));

		return [];
	});

	let hideTimer = null;

	function cancelHide() {
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function scheduleRailHide() {
		// Note: an open sub-flyout (subFor) must NOT block hiding — otherwise a
		// sticky flyout keeps the whole rail open forever. The timeout closes both.
		if (get(pinned) || get(activePanel) || get(settingsOpen) || get(sysWpOpen) || get(scrubbing)) return;

		cancelHide();

		hideTimer = setTimeout(
			() => {
				set(railVisible, false);
				set(subFor, null);
			},
			wpState.value.autoHideMs
		);
	}

	function updateHighlight(e) {
		const el = document.elementFromPoint(e.clientX, e.clientY);
		const sub = el?.closest('[data-sub-id]');

		if (sub) {
			set(subHighlight, sub.dataset.subId ?? get(subHighlight), true);

			return;
		}

		const item = el?.closest('[data-rail-id]');

		if (item) {
			set(highlightedRail, item.dataset.railId ?? get(highlightedRail), true);
			set(subHighlight, null);

			const it = RAIL_ITEMS.find((x) => x.id === get(highlightedRail));

			set(subFor, it?.sub ? get(highlightedRail) : null, true);

			return;
		}

		// Finger is off the rail/flyout entirely → clear the pending selection, so
		// releasing out here cancels instead of firing the last-highlighted item.
		if (!el?.closest('.rail-zone')) {
			set(highlightedRail, null);
			set(subHighlight, null);
		}
	}

	function startScrub(e) {
		set(scrubbing, true);
		set(railVisible, true);
		cancelHide();
		updateHighlight(e);
		window.addEventListener('pointermove', onScrubMove);
		window.addEventListener('pointerup', onScrubEnd);
		window.addEventListener('pointercancel', onScrubEnd);
	}

	function onScrubMove(e) {
		if (get(scrubbing)) updateHighlight(e);
	}

	function onScrubEnd() {
		window.removeEventListener('pointermove', onScrubMove);
		window.removeEventListener('pointerup', onScrubEnd);
		window.removeEventListener('pointercancel', onScrubEnd);
		set(scrubbing, false);

		const sub = get(subHighlight);
		const main = get(highlightedRail);
		const forId = get(subFor);

		set(highlightedRail, null);
		set(subHighlight, null);

		if (sub && forId) {
			applySub(forId, sub);
			set(subFor, null);
		} else if (main) {
			const it = RAIL_ITEMS.find((x) => x.id === main);

			if (it?.sub) {
				// Toggle the flyout: keep it open so you can also tap a value.
				set(subFor, get(subFor) === main ? main : main, true);
			} else {
				set(subFor, null);
				activateRail(main);
			}
		}

		scheduleRailHide();
	}

	function applySub(forId, id) {
		// Toggle: swiping the active colour again removes the filter (like SKWD).
		if (forId === 'color') set(colorKey, get(colorKey) === id ? null : id, true); else if (forId === 'sort') {
			if (id === 'shuffle') set(shuffleSeed, get(shuffleSeed // reshuffle each pick
			) * 1103515245 + 12345 >>> 0);

			set(sortBy, id, true);
		} else if (forId === 'media') set(mediaTab, id, true);
	}

	function activateRail(id) {
		cancelHide();

		switch (id) {
			case 'add':
				set(addOpen, true);
				break;

			case 'search':
				set(activePanel, get(activePanel) === 'search' ? null : 'search', true);
				break;

			case 'favorites':
				set(favOnly, !get(favOnly));
				scheduleRailHide();
				break;

			case 'random':
				applyRandom();
				scheduleRailHide();
				break;

			case 'syswp':
				if (get(activeId)) set(sysWpOpen, true);
				break;

			case 'theme':
				cycleTheme();
				scheduleRailHide();
				break;

			case 'settings':
				set(settingsOpen, true);
				break;
		}
	}

	function applyRandom() {
		const pool = get(items).length ? get(items) : get(allItems);

		if (!pool.length) return;

		const pick = pool[Math.floor(Math.random() * pool.length)];

		$$props.manager.setActive(pick.id);
	}

	function closePanel() {
		set(activePanel, null);
		scheduleRailHide();
	}

	function closeSub() {
		set(subFor, null);
		scheduleRailHide();
	}

	async function onUpload(e) {
		const input = e.target;
		const files = input.files;

		if (!files?.length) return;

		set(uploading, true);

		for (const f of Array.from(files)) await $$props.manager.addImage(f);

		set(uploading, false);
		input.value = '';
		scheduleRailHide();
	}

	function select(id) {
		if (suppressTap) return; // ignore the click that trails a browse-drag

		$$props.manager.setActive(id);

		// "Close on selection": collapse the rail/panels right after picking.
		if (wpState.value.closeOnSelection) {
			set(activePanel, null);
			set(railVisible, false);
		}
	}

	var div = root_54();
	let classes;
	var div_1 = child(div);
	var node_8 = child(div_1);

	{
		var consequent_6 = ($$anchor) => {
			var div_2 = root_9$1();
			var button = child(div_2);
			let classes_1;
			var node_9 = sibling(button, 2);

			each(node_9, 17, () => get(collections), (c) => c.id, ($$anchor, c) => {
				var button_1 = root_6$1();
				let classes_2;
				var text_1 = child(button_1);
				var span_4 = sibling(text_1);
				var text_2 = only_child(span_4, true);

				template_effect(() => {
					classes_2 = set_class(button_1, 1, 'coll-chip svelte-1lk0sb9', null, classes_2, { on: get(activeCollectionId) === get(c).id });
					set_text(text_1, `${get(c).name ?? ''} `);
					set_text(text_2, get(c).itemIds.length);
				});

				delegated('click', button_1, () => $$props.manager.setActiveCollection(get(c).id));
				append($$anchor, button_1);
			});

			var node_10 = sibling(node_9, 2);

			{
				var consequent_5 = ($$anchor) => {
					var input_1 = root_7$1();

					delegated('keydown', input_1, (e) => {
						if (e.key === 'Enter') createCollectionFromBar();

						if (e.key === 'Escape') {
							set(collBarCreating, false);
							set(newCollName, '');
						}
					});

					event('blur', input_1, createCollectionFromBar);
					bind_value(input_1, () => get(newCollName), ($$value) => set(newCollName, $$value));
					append($$anchor, input_1);
				};

				var alternate = ($$anchor) => {
					var button_2 = root_8$1();

					delegated('click', button_2, () => {
						set(collBarCreating, true);
					});

					append($$anchor, button_2);
				};

				if_block(node_10, ($$render) => {
					if (get(collBarCreating)) $$render(consequent_5); else $$render(alternate, -1);
				});
			}
			template_effect(() => classes_1 = set_class(button, 1, 'coll-chip svelte-1lk0sb9', null, classes_1, { on: get(activeCollectionId) === null }));
			delegated('click', button, () => $$props.manager.setActiveCollection(null));
			append($$anchor, div_2);
		};

		if_block(node_8, ($$render) => {
			if (get(collections).length || get(collBarCreating)) $$render(consequent_6);
		});
	}

	var node_11 = sibling(node_8, 2);

	{
		var consequent_7 = ($$anchor) => {
			var div_3 = root_10$1();

			append($$anchor, div_3);
		};

		var consequent_9 = ($$anchor) => {
			var div_4 = root_12$1();
			var label = sibling(child(div_4), 4);
			var node_12 = child(label);

			Icon(node_12, { name: 'upload', size: 18 });

			var input_2 = sibling(node_12, 2);

			var node_13 = sibling(label, 4);

			{
				var consequent_8 = ($$anchor) => {
					var button_3 = root_11$1();
					var node_14 = child(button_3);

					Icon(node_14, { name: 'folder', size: 18 });
					delegated('click', button_3, () => void $$props.manager.addFolder('image'));
					append($$anchor, button_3);
				};

				if_block(node_13, ($$render) => {
					if (foldersSupported) $$render(consequent_8);
				});
			}

			var button_4 = sibling(node_13, 2);
			var node_15 = child(button_4);

			Icon(node_15, { name: 'search', size: 18 });
			delegated('change', input_2, onUpload);

			delegated('click', button_4, () => {
				set(addOpen, true);
				openWebTab();
			});

			append($$anchor, div_4);
		};

		var consequent_10 = ($$anchor) => {
			var div_5 = root_13$1();
			var button_5 = sibling(child(div_5), 4);
			delegated('click', button_5, clearFilters);
			append($$anchor, div_5);
		};

		var consequent_11 = ($$anchor) => {
			var div_6 = root_15$1();

			each(div_6, 23, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_6 = root_14$1();
				let classes_3;
				var node_16 = child(button_6);

				tileInner(node_16, () => get(item));
				action(button_6, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_6, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_3 = set_class(button_6, 1, 'tile hex svelte-1lk0sb9', null, classes_3, { active: get(item).id === get(activeId) });
						set_style(button_6, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_6, 'title', get(item).name);
					},
					[() => hexStyle(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_6);
			});
			template_effect(() => set_style(div_6, `width:${get(hexWrapW) ?? ''}px;height:${get(hexWrapH) ?? ''}px;transform:translateX(${wpState.value.hexOffsetX ?? ''}px)`));
			append($$anchor, div_6);
		};

		var consequent_12 = ($$anchor) => {
			var div_7 = root_16$1();

			each(div_7, 23, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_7 = root_14$1();
				let classes_4;
				var node_17 = child(button_7);

				tileInner(node_17, () => get(item));
				action(button_7, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_7, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_4 = set_class(button_7, 1, 'tile slice svelte-1lk0sb9', null, classes_4, { active: get(item).id === get(activeId) });
						set_style(button_7, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_7, 'title', get(item).name);
					},
					[() => slicesTf(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_7);
			});
			event('wheel', div_7, onStageWheel);
			delegated('pointerdown', div_7, onStagePointerDown);
			delegated('pointermove', div_7, onStagePointerMove);
			delegated('pointerup', div_7, onStagePointerUp);
			event('pointercancel', div_7, onStagePointerUp);
			append($$anchor, div_7);
		};

		var consequent_13 = ($$anchor) => {
			var div_8 = root_17$1();

			each(div_8, 23, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_8 = root_14$1();
				let classes_5;
				var node_18 = child(button_8);

				tileInner(node_18, () => get(item));
				action(button_8, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_8, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_5 = set_class(button_8, 1, 'tile depthcard svelte-1lk0sb9', null, classes_5, { active: get(item).id === get(activeId) });
						set_style(button_8, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_8, 'title', get(item).name);
					},
					[() => depthTf(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_8);
			});
			event('wheel', div_8, onStageWheel);
			delegated('pointerdown', div_8, onStagePointerDown);
			delegated('pointermove', div_8, onStagePointerMove);
			delegated('pointerup', div_8, onStagePointerUp);
			event('pointercancel', div_8, onStagePointerUp);
			append($$anchor, div_8);
		};

		var consequent_14 = ($$anchor) => {
			var div_9 = root_19$1();
			var button_9 = child(div_9);
			let classes_6;
			var node_19 = child(button_9);

			tileInner(node_19, () => get(items)[get(centerIndex)]);
			action(button_9, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(items)[get(centerIndex)].id);

			action(button_9, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
				onLong: () => openDetail(get(items)[get(centerIndex)]),
				onTap: () => select(get(items)[get(centerIndex)].id)
			}));

			var node_20 = sibling(button_9, 2);

			each(node_20, 19, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_10 = root_18$1();
				let classes_7;

				action(button_10, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_10, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_7 = set_class(button_10, 1, 'tile sandy-thumb svelte-1lk0sb9', null, classes_7, { active: get(item).id === get(activeId) });
						set_style(button_10, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_10, 'title', get(item).name);
					},
					[() => sandyStripTf(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_10);
			});

			template_effect(
				($0) => {
					classes_6 = set_class(button_9, 1, 'tile sandy-hero svelte-1lk0sb9', null, classes_6, {
						active: get(items)[get(centerIndex)].id === get(activeId)
					});

					set_style(button_9, `left:${get(cx) + (wpState.value.sandySide === 'left' ? 28 : -28)}px;top:${get(cy) ?? ''}px;width:${get(sandyHeroW) ?? ''}px;height:${get(sandyHeroH) ?? ''}px;${$0 ?? ''}`);
					set_attribute(button_9, 'title', get(items)[get(centerIndex)].name);
				},
				[() => bg(get(items)[get(centerIndex)].id)]
			);

			event('wheel', div_9, onStageWheel);
			delegated('pointerdown', div_9, onStagePointerDown);
			delegated('pointermove', div_9, onStagePointerMove);
			delegated('pointerup', div_9, onStagePointerUp);
			event('pointercancel', div_9, onStagePointerUp);
			append($$anchor, div_9);
		};

		var consequent_15 = ($$anchor) => {
			var div_10 = root_20$1();

			each(div_10, 23, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_11 = root_14$1();
				let classes_8;
				var node_21 = child(button_11);

				tileInner(node_21, () => get(item));
				action(button_11, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_11, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_8 = set_class(button_11, 1, 'tile fan svelte-1lk0sb9', null, classes_8, { active: get(item).id === get(activeId) });
						set_style(button_11, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_11, 'title', get(item).name);
					},
					[() => handTf(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_11);
			});
			event('wheel', div_10, onStageWheel);
			delegated('pointerdown', div_10, onStagePointerDown);
			delegated('pointermove', div_10, onStagePointerMove);
			delegated('pointerup', div_10, onStagePointerUp);
			event('pointercancel', div_10, onStagePointerUp);
			append($$anchor, div_10);
		};

		var consequent_16 = ($$anchor) => {
			var div_11 = root_21$1();

			each(div_11, 23, () => get(items), (item) => item.id, ($$anchor, item, i) => {
				var button_12 = root_14$1();
				let classes_9;
				var node_22 = child(button_12);

				tileInner(node_22, () => get(item));
				action(button_12, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_12, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0, $1) => {
						classes_9 = set_class(button_12, 1, 'tile stack svelte-1lk0sb9', null, classes_9, { active: get(item).id === get(activeId) });
						set_style(button_12, `${$0 ?? ''}${$1 ?? ''}`);
						set_attribute(button_12, 'title', get(item).name);
					},
					[() => collTf(get(i)), () => bg(get(item).id)]
				);

				append($$anchor, button_12);
			});
			event('wheel', div_11, onStageWheel);
			delegated('pointerdown', div_11, onStagePointerDown);
			delegated('pointermove', div_11, onStagePointerMove);
			delegated('pointerup', div_11, onStagePointerUp);
			event('pointercancel', div_11, onStagePointerUp);
			append($$anchor, div_11);
		};

		var alternate_1 = ($$anchor) => {
			var div_12 = root_22$1();

			each(div_12, 21, () => get(items), (item) => item.id, ($$anchor, item) => {
				var button_13 = root_14$1();
				let classes_10;
				var node_23 = child(button_13);

				tileInner(node_23, () => get(item));
				action(button_13, ($$node, $$action_arg) => ensure?.($$node, $$action_arg), () => get(item).id);

				action(button_13, ($$node, $$action_arg) => longpress?.($$node, $$action_arg), () => ({
					onLong: () => openDetail(get(item)),
					onTap: () => select(get(item).id)
				}));

				template_effect(
					($0) => {
						classes_10 = set_class(button_13, 1, 'tile svelte-1lk0sb9', null, classes_10, { active: get(item).id === get(activeId) });
						set_style(button_13, $0);
						set_attribute(button_13, 'title', get(item).name);
					},
					[() => bg(get(item).id)]
				);

				append($$anchor, button_13);
			});
			append($$anchor, div_12);
		};

		if_block(node_11, ($$render) => {
			if (get(mediaTab) === 'we') $$render(consequent_7); else if (get(allItems).length === 0) $$render(consequent_9, 1); else if (get(items).length === 0) $$render(consequent_10, 2); else if (get(mode) === 'geometric') $$render(consequent_11, 3); else if (get(mode) === 'slices') $$render(consequent_12, 4); else if (get(mode) === 'depth') $$render(consequent_13, 5); else if (get(mode) === 'sandy') $$render(consequent_14, 6); else if (get(mode) === 'hand') $$render(consequent_15, 7); else if (get(mode) === 'collection') $$render(consequent_16, 8); else $$render(alternate_1, -1);
		});
	}

	var node_24 = sibling(div_1, 2);

	{
		var consequent_17 = ($$anchor) => {
			var div_13 = root_23$1();

			delegated('pointerdown', div_13, closeSub);
			append($$anchor, div_13);
		};

		if_block(node_24, ($$render) => {
			if (get(subFor)) $$render(consequent_17);
		});
	}

	var div_14 = sibling(node_24, 2);
	var node_25 = child(div_14);

	{
		var consequent_19 = ($$anchor) => {
			var aside = root_26$1();
			let classes_11;

			each(aside, 21, () => get(subItems), (s) => s.id, ($$anchor, s) => {
				var div_15 = root_25$1();
				let classes_12;
				var node_26 = child(div_15);

				{
					var consequent_18 = ($$anchor) => {
						var span_5 = root_24$1();
						var text_3 = only_child(span_5, true);

						template_effect(() => set_text(text_3, get(s).label));
						append($$anchor, span_5);
					};

					if_block(node_26, ($$render) => {
						if (get(subFor) !== 'color') $$render(consequent_18);
					});
				}

				template_effect(() => {
					classes_12 = set_class(div_15, 1, 'sub-item svelte-1lk0sb9', null, classes_12, {
						color: get(subFor) === 'color',
						hi: get(subHighlight) === get(s).id,
						on: get(subFor) === 'color' && get(colorKey) === get(s).id || get(subFor) === 'sort' && get(sortBy) === get(s).id || get(subFor) === 'media' && get(mediaTab) === get(s).id
					});

					set_attribute(div_15, 'data-sub-id', get(s).id);
					set_style(div_15, get(s).swatch ? `--sw:${get(s).swatch}` : '');
					set_attribute(div_15, 'title', get(s).label);
				});

				append($$anchor, div_15);
			});

			template_effect(() => {
				classes_11 = set_class(aside, 1, 'subrail svelte-1lk0sb9', null, classes_11, { color: get(subFor) === 'color' });
				set_attribute(aside, 'data-side', get(side));
			});

			append($$anchor, aside);
		};

		if_block(node_25, ($$render) => {
			if (get(subFor)) $$render(consequent_19);
		});
	}

	var aside_1 = sibling(node_25, 2);
	let classes_13;

	each(aside_1, 21, () => get(railItems), (it) => it.id, ($$anchor, it) => {
		var div_16 = root_28$1();
		let classes_14;
		var node_27 = child(div_16);

		{
			let $0 = user_derived(() => get(it).id === 'theme' ? get(themeIcon) : get(it).icon);

			Icon(node_27, {
				get name() {
					return get($0);
				},
				size: 20
			});
		}

		var node_28 = sibling(node_27, 2);

		{
			var consequent_20 = ($$anchor) => {
				var span_6 = root_27$1();
				var text_4 = only_child(span_6, true);

				template_effect(() => set_text(text_4, get(it).label));
				append($$anchor, span_6);
			};

			if_block(node_28, ($$render) => {
				if (get(scrubbing) && get(highlightedRail) === get(it).id && get(subFor) !== get(it).id) $$render(consequent_20);
			});
		}

		template_effect(() => {
			classes_14 = set_class(div_16, 1, 'rail-item svelte-1lk0sb9', null, classes_14, {
				hi: get(highlightedRail) === get(it).id,
				open: get(it).sub && get(subFor) === get(it).id,
				on: get(it).id === 'favorites' && get(favOnly) || get(it).id === 'settings' && get(settingsOpen) || get(it).id === 'search' && get(activePanel) === 'search' || get(it).id === 'color' && get(colorKey) !== null || get(it).id === 'media' && get(mediaTab) !== 'all'
			});

			set_attribute(div_16, 'data-rail-id', get(it).id);
		});

		append($$anchor, div_16);
	});

	var node_29 = sibling(div_14, 2);

	{
		var consequent_25 = ($$anchor) => {
			var fragment_2 = root_34();
			var node_30 = first_child(fragment_2);

			{
				var consequent_21 = ($$anchor) => {
					var div_17 = root_29$1();

					delegated('click', div_17, closePanel);
					append($$anchor, div_17);
				};

				if_block(node_30, ($$render) => {
					if (get(activePanel) === 'search' && !wpState.value.alwaysSearchBar) $$render(consequent_21);
				});
			}

			var div_18 = sibling(node_30, 2);
			let classes_15;
			var div_19 = child(div_18);
			var node_31 = child(div_19);

			Icon(node_31, { name: 'search', size: 16 });

			var node_32 = sibling(node_31, 2);

			{
				var consequent_22 = ($$anchor) => {
					var button_14 = root_30$1();

					delegated('click', button_14, () => $$props.manager.setField('alwaysSearchBar', false));
					append($$anchor, button_14);
				};

				if_block(node_32, ($$render) => {
					if (wpState.value.alwaysSearchBar) $$render(consequent_22);
				});
			}

			var input_3 = sibling(div_19, 2);

			var node_33 = sibling(input_3, 2);

			{
				var consequent_23 = ($$anchor) => {
					var fragment_3 = root_32();
					var div_20 = sibling(first_child(fragment_3), 2);

					each(div_20, 20, () => get(allTags), (t) => t, ($$anchor, t) => {
						var button_15 = root_31();
						let classes_16;
						var text_5 = only_child(button_15, true);

						template_effect(
							($0) => {
								classes_16 = set_class(button_15, 1, 'sp-tag svelte-1lk0sb9', null, classes_16, { on: $0 });
								set_text(text_5, t);
							},
							[() => get(selectedTags).includes(t)]
						);

						delegated('click', button_15, () => toggleTag(t));
						append($$anchor, button_15);
					});
					append($$anchor, fragment_3);
				};

				if_block(node_33, ($$render) => {
					if (get(allTags).length) $$render(consequent_23);
				});
			}

			var node_34 = sibling(node_33, 2);

			{
				var consequent_24 = ($$anchor) => {
					var button_16 = root_33();

					delegated('click', button_16, clearFilters);
					append($$anchor, button_16);
				};

				if_block(node_34, ($$render) => {
					if (get(filtersActive)) $$render(consequent_24);
				});
			}

			template_effect(() => {
				classes_15 = set_class(div_18, 1, 'side-panel svelte-1lk0sb9', null, classes_15, { docked: wpState.value.alwaysSearchBar });
				set_attribute(div_18, 'data-side', get(side));
			});

			bind_value(input_3, () => get(search), ($$value) => set(search, $$value));
			append($$anchor, fragment_2);
		};

		if_block(node_29, ($$render) => {
			if (get(activePanel) === 'search' || wpState.value.alwaysSearchBar) $$render(consequent_25);
		});
	}

	var node_35 = sibling(node_29, 2);

	{
		var consequent_26 = ($$anchor) => {
			var div_21 = root_35();
			var div_22 = child(div_21);
			var button_17 = sibling(child(div_22), 2);
			var node_36 = child(button_17);

			Icon(node_36, { name: 'close', size: 22 });

			var div_23 = sibling(div_22, 2);
			var node_37 = child(div_23);

			WallpaperSettings(node_37, {
				get app() {
					return $$props.app;
				},

				get manager() {
					return $$props.manager;
				}
			});

			delegated('click', button_17, () => {
				set(settingsOpen, false);
				scheduleRailHide();
			});

			append($$anchor, div_21);
		};

		if_block(node_35, ($$render) => {
			if (get(settingsOpen)) $$render(consequent_26);
		});
	}

	var node_38 = sibling(node_35, 2);

	{
		var consequent_33 = ($$anchor) => {
			var div_24 = root_44();
			var div_25 = child(div_24);
			var button_18 = sibling(child(div_25), 2);
			var node_39 = child(button_18);

			Icon(node_39, { name: 'close', size: 22 });

			var div_26 = sibling(div_25, 2);
			var button_19 = child(div_26);
			let classes_17;
			var node_40 = child(button_19);

			Icon(node_40, { name: 'upload', size: 16 });

			var button_20 = sibling(button_19, 2);
			let classes_18;
			var node_41 = child(button_20);

			Icon(node_41, { name: 'search', size: 16 });

			var node_42 = sibling(div_26, 2);

			{
				var consequent_27 = ($$anchor) => {
					var div_27 = root_36();
					var label_1 = child(div_27);
					var node_43 = child(label_1);

					Icon(node_43, { name: 'upload', size: 26 });

					var span_7 = sibling(node_43, 2);
					var text_6 = only_child(span_7, true);
					var input_4 = sibling(span_7, 2);
					template_effect(() => set_text(text_6, get(uploading) ? 'Lädt…' : 'Bilder vom Gerät wählen'));
					delegated('change', input_4, onUpload);
					append($$anchor, div_27);
				};

				var alternate_2 = ($$anchor) => {
					var fragment_4 = root_43();
					var div_28 = first_child(fragment_4);
					var div_29 = child(div_28);
					var input_5 = child(div_29);

					var button_21 = sibling(input_5, 2);
					var node_44 = child(button_21);

					Icon(node_44, { name: 'search', size: 16 });

					var button_22 = sibling(button_21, 2);
					let classes_19;
					var node_45 = child(button_22);

					Icon(node_45, { name: 'filter', size: 16 });

					var node_46 = sibling(div_29, 2);

					{
						var consequent_28 = ($$anchor) => {
							var fragment_5 = root_37();
							var div_30 = first_child(fragment_5);

							each(div_30, 21, () => WH_SORTINGS, index, ($$anchor, s) => {
								var button_23 = root_31();
								let classes_20;
								var text_7 = only_child(button_23, true);

								template_effect(() => {
									classes_20 = set_class(button_23, 1, 'wh-chip svelte-1lk0sb9', null, classes_20, { on: whFilters.sorting === get(s).value });
									set_text(text_7, get(s).label);
								});

								delegated('click', button_23, () => {
									whFilters.sorting = get(s).value;
									doSearch();
								});

								append($$anchor, button_23);
							});

							var div_31 = sibling(div_30, 2);
							var node_47 = child(div_31);

							each(node_47, 17, () => WH_CATEGORIES, index, ($$anchor, c, i) => {
								var button_24 = root_31();
								let classes_21;
								var text_8 = only_child(button_24, true);

								template_effect(() => {
									classes_21 = set_class(button_24, 1, 'wh-chip svelte-1lk0sb9', null, classes_21, { on: whFilters.categories[i] });
									set_text(text_8, get(c));
								});

								delegated('click', button_24, () => toggleCategory(i));
								append($$anchor, button_24);
							});

							var node_48 = sibling(node_47, 4);

							each(node_48, 16, () => [['all', 'Alle'], ['landscape', 'Quer'], ['portrait', 'Hoch']], index, ($$anchor, $$item) => {
								var $$array = user_derived(() => to_array($$item, 2));
								let v = () => get($$array)[0];
								let l = () => get($$array)[1];
								var button_25 = root_31();
								let classes_22;
								var text_9 = only_child(button_25, true);

								template_effect(() => {
									classes_22 = set_class(button_25, 1, 'wh-chip svelte-1lk0sb9', null, classes_22, { on: whFilters.ratio === v() });
									set_text(text_9, l());
								});

								delegated('click', button_25, () => {
									whFilters.ratio = v();
									doSearch();
								});

								append($$anchor, button_25);
							});
							append($$anchor, fragment_5);
						};

						if_block(node_46, ($$render) => {
							if (get(whFiltersOpen)) $$render(consequent_28);
						});
					}

					var node_49 = sibling(div_28, 2);

					{
						var consequent_29 = ($$anchor) => {
							var p_1 = root_38();
							var text_10 = only_child(p_1, true);

							template_effect(() => set_text(text_10, get(whError)));
							append($$anchor, p_1);
						};

						if_block(node_49, ($$render) => {
							if (get(whError)) $$render(consequent_29);
						});
					}

					var div_32 = sibling(node_49, 2);
					var div_33 = child(div_32);

					each(div_33, 21, () => get(whResults), (r) => r.id, ($$anchor, r) => {
						var button_26 = root_39();
						var span_8 = child(button_26);
						var text_11 = only_child(span_8, true);

						template_effect(() => {
							set_style(button_26, `background-image:url(${get(r).thumb ?? ''})`);
							set_text(text_11, get(r).resolution);
						});

						delegated('click', button_26, () => set(whPreview, get(r), true));
						append($$anchor, button_26);
					});

					var node_50 = sibling(div_33, 2);

					{
						var consequent_30 = ($$anchor) => {
							var p_2 = root_40();

							append($$anchor, p_2);
						};

						if_block(node_50, ($$render) => {
							if (get(whLoading)) $$render(consequent_30);
						});
					}

					var node_51 = sibling(node_50, 2);

					{
						var consequent_31 = ($$anchor) => {
							var p_3 = root_41();

							append($$anchor, p_3);
						};

						if_block(node_51, ($$render) => {
							if (!get(whLoading) && get(whResults).length === 0 && !get(whError)) $$render(consequent_31);
						});
					}

					var node_52 = sibling(node_51, 2);

					{
						var consequent_32 = ($$anchor) => {
							var p_4 = root_42();

							append($$anchor, p_4);
						};

						if_block(node_52, ($$render) => {
							if (!get(whLoading) && get(whPage) >= get(whLastPage) && get(whResults).length > 0) $$render(consequent_32);
						});
					}

					template_effect(() => {
						button_21.disabled = get(whLoading);
						classes_19 = set_class(button_22, 1, 'wh-filter-btn svelte-1lk0sb9', null, classes_19, { on: get(whFiltersOpen) || get(whFiltersActive) });
						set_style(div_33, `grid-template-columns:repeat(${wpState.value.whColumns ?? ''}, 1fr)`);
					});

					delegated('keydown', input_5, (e) => e.key === 'Enter' && doSearch());
					bind_value(input_5, () => whFilters.query, ($$value) => whFilters.query = $$value);
					delegated('click', button_21, doSearch);
					delegated('click', button_22, () => set(whFiltersOpen, !get(whFiltersOpen)));
					event('scroll', div_32, onWhScroll);
					append($$anchor, fragment_4);
				};

				if_block(node_42, ($$render) => {
					if (get(addTab) === 'upload') $$render(consequent_27); else $$render(alternate_2, -1);
				});
			}

			template_effect(() => {
				classes_17 = set_class(button_19, 1, 'svelte-1lk0sb9', null, classes_17, { on: get(addTab) === 'upload' });
				classes_18 = set_class(button_20, 1, 'svelte-1lk0sb9', null, classes_18, { on: get(addTab) === 'web' });
			});

			delegated('click', button_18, () => {
				set(addOpen, false);
				scheduleRailHide();
			});

			delegated('click', button_19, () => set(addTab, 'upload'));
			delegated('click', button_20, openWebTab);
			append($$anchor, div_24);
		};

		if_block(node_38, ($$render) => {
			if (get(addOpen)) $$render(consequent_33);
		});
	}

	var node_53 = sibling(node_38, 2);

	{
		var consequent_35 = ($$anchor) => {
			const p = user_derived(() => get(whPreview));
			var div_34 = root_46();
			var div_35 = child(div_34);
			var button_27 = child(div_35);
			var node_54 = child(button_27);

			Icon(node_54, { name: 'close', size: 22 });

			var div_36 = sibling(div_35, 2);
			var div_37 = sibling(div_36, 2);
			var node_55 = child(div_37);

			{
				var consequent_34 = ($$anchor) => {
					var span_9 = root_45();
					var text_12 = only_child(span_9, true);

					template_effect(() => set_text(text_12, get(whError)));
					append($$anchor, span_9);
				};

				if_block(node_55, ($$render) => {
					if (get(whError)) $$render(consequent_34);
				});
			}

			var span_10 = sibling(node_55, 2);
			var text_13 = only_child(span_10, true);
			var button_28 = sibling(span_10, 2);
			var text_14 = only_child(button_28, true);

			template_effect(() => {
				set_style(div_36, `background-image:url(${get(p).full ?? ''})`);
				set_text(text_13, get(p).resolution);
				button_28.disabled = get(whAdding) === get(p).id;
				set_text(text_14, get(whAdding) === get(p).id ? 'Lädt…' : 'Herunterladen');
			});

			delegated('click', button_27, () => set(whPreview, null));
			delegated('click', button_28, () => addFromWeb(get(p)));
			append($$anchor, div_34);
		};

		if_block(node_53, ($$render) => {
			if (get(whPreview)) $$render(consequent_35);
		});
	}

	var node_56 = sibling(node_53, 2);

	{
		var consequent_36 = ($$anchor) => {
			var div_38 = root_47();
			var div_39 = child(div_38);
			var button_29 = child(div_39);
			var node_57 = child(button_29);

			Icon(node_57, { name: 'close', size: 22 });

			var div_40 = sibling(div_39, 2);
			var div_41 = sibling(div_40, 2);
			var div_42 = child(div_41);

			each(div_42, 21, () => EFFECTS, index, ($$anchor, e) => {
				var button_30 = root_31();
				let classes_23;
				var text_15 = only_child(button_30, true);

				template_effect(() => {
					classes_23 = set_class(button_30, 1, 'fx-chip svelte-1lk0sb9', null, classes_23, { on: get(effectType) === get(e).value });
					button_30.disabled = get(effectBusy);
					set_text(text_15, get(e).label);
				});

				delegated('click', button_30, () => selectEffect(get(e).value));
				append($$anchor, button_30);
			});

			var button_31 = sibling(div_42, 2);
			var text_16 = only_child(button_31, true);

			template_effect(() => {
				set_style(div_40, get(effectPreview) ? `background-image:url(${get(effectPreview)})` : '');
				button_31.disabled = get(effectBusy) || get(effectType) === 'none';
				set_text(text_16, get(effectBusy) ? 'Verarbeite…' : 'Als neues Wallpaper speichern');
			});

			delegated('click', button_29, closeEffects);
			delegated('click', button_31, saveEffect);
			append($$anchor, div_38);
		};

		if_block(node_56, ($$render) => {
			if (get(effectItem)) $$render(consequent_36);
		});
	}

	var node_58 = sibling(node_56, 2);

	{
		var consequent_38 = ($$anchor) => {
			var div_43 = root_48();
			var div_44 = child(div_43);
			var button_32 = child(div_44);
			var node_59 = child(button_32);

			Icon(node_59, { name: 'close', size: 22 });

			var div_45 = sibling(div_44, 2);
			var node_60 = child(div_45);

			{
				var consequent_37 = ($$anchor) => {
					var span_11 = root_45();
					var text_17 = only_child(span_11, true);

					template_effect(() => set_text(text_17, get(applyMsg)));
					append($$anchor, span_11);
				};

				if_block(node_60, ($$render) => {
					if (get(applyMsg)) $$render(consequent_37);
				});
			}

			var div_46 = sibling(node_60, 2);
			var button_33 = child(div_46);
			let classes_24;
			var node_61 = child(button_33);

			Icon(node_61, { name: 'home', size: 18 });

			var button_34 = sibling(button_33, 2);
			let classes_25;
			var node_62 = child(button_34);

			Icon(node_62, { name: 'lock', size: 18 });

			var button_35 = sibling(div_46, 2);
			var text_18 = only_child(button_35, true);

			template_effect(() => {
				set_style(div_43, get(activeId) && urls.value[get(activeId)]
					? `background-image:url(${urls.value[get(activeId)]})`
					: '');

				classes_24 = set_class(button_33, 1, 'syswp-chip svelte-1lk0sb9', null, classes_24, { on: get(setHome) });
				classes_25 = set_class(button_34, 1, 'syswp-chip svelte-1lk0sb9', null, classes_25, { on: get(setLock) });
				button_35.disabled = get(applying);
				set_text(text_18, get(applying) ? 'Setze…' : 'Setzen');
			});

			delegated('click', button_32, () => set(sysWpOpen, false));
			delegated('click', button_33, () => $$props.manager.setWallpaperTargets(!get(setHome), get(setLock)));
			delegated('click', button_34, () => $$props.manager.setWallpaperTargets(get(setHome), !get(setLock)));
			delegated('click', button_35, setAsSystem);
			append($$anchor, div_43);
		};

		if_block(node_58, ($$render) => {
			if (get(sysWpOpen)) $$render(consequent_38);
		});
	}

	var node_63 = sibling(node_58, 2);

	{
		var consequent_41 = ($$anchor) => {
			const d = user_derived(() => get(detailItem));
			var div_47 = root_53();
			var div_48 = child(div_47);
			let classes_26;
			var div_49 = child(div_48);
			var div_50 = child(div_49);
			var div_51 = sibling(div_50, 2);
			var button_36 = child(div_51);
			let classes_27;
			var node_64 = child(button_36);

			Icon(node_64, { name: 'star', size: 30 });

			var span_12 = sibling(node_64, 2);
			var text_19 = only_child(span_12, true);

			var div_52 = sibling(button_36, 2);
			var div_53 = sibling(child(div_52), 2);
			var node_65 = child(div_53);

			each(node_65, 16, () => get(detailTags), (t) => t, ($$anchor, t) => {
				var span_13 = root_49();
				var text_20 = child(span_13);
				var button_37 = sibling(text_20);
				template_effect(() => set_text(text_20, t));
				delegated('click', button_37, () => $$props.manager.removeTag(get(d).id, t));
				append($$anchor, span_13);
			});

			var node_66 = sibling(node_65, 2);

			{
				var consequent_39 = ($$anchor) => {
					var span_14 = root_50();

					append($$anchor, span_14);
				};

				if_block(node_66, ($$render) => {
					if (get(detailTags).length === 0) $$render(consequent_39);
				});
			}

			var input_6 = sibling(div_53, 2);

			var div_54 = sibling(div_52, 2);
			var div_55 = sibling(child(div_54), 2);
			var node_67 = child(div_55);

			each(node_67, 17, () => get(collections), (c) => c.id, ($$anchor, c) => {
				var button_38 = root_31();
				let classes_28;
				var text_21 = only_child(button_38, true);

				template_effect(
					($0) => {
						classes_28 = set_class(button_38, 1, 'coll-chip sm svelte-1lk0sb9', null, classes_28, { on: $0 });
						set_text(text_21, get(c).name);
					},
					[() => get(c).itemIds.includes(get(d).id)]
				);

				delegated('click', button_38, () => $$props.manager.toggleInCollection(get(c).id, get(d).id));
				append($$anchor, button_38);
			});

			var node_68 = sibling(node_67, 2);

			{
				var consequent_40 = ($$anchor) => {
					var input_7 = root_51();

					delegated('keydown', input_7, (e) => {
						if (e.key === 'Enter') createCollForDetail();

						if (e.key === 'Escape') {
							set(detailCollCreating, false);
							set(detailNewColl, '');
						}
					});

					event('blur', input_7, createCollForDetail);
					bind_value(input_7, () => get(detailNewColl), ($$value) => set(detailNewColl, $$value));
					append($$anchor, input_7);
				};

				var alternate_3 = ($$anchor) => {
					var button_39 = root_52();

					delegated('click', button_39, () => {
						set(detailCollCreating, true);
					});

					append($$anchor, button_39);
				};

				if_block(node_68, ($$render) => {
					if (get(detailCollCreating)) $$render(consequent_40); else $$render(alternate_3, -1);
				});
			}

			var div_56 = sibling(div_54, 2);
			var button_40 = child(div_56);
			var node_69 = child(button_40);

			Icon(node_69, { name: 'palette', size: 18 });

			var button_41 = sibling(button_40, 2);
			var node_70 = child(button_41);

			Icon(node_70, { name: 'trash', size: 18 });

			var button_42 = sibling(div_56, 2);
			var node_71 = child(button_42);

			Icon(node_71, { name: 'check', size: 18 });

			template_effect(
				($0) => {
					classes_26 = set_class(div_48, 1, 'flip-card svelte-1lk0sb9', null, classes_26, { flipped: get(flipped) });
					set_style(div_50, $0);
					classes_27 = set_class(button_36, 1, 'fav-big svelte-1lk0sb9', null, classes_27, { on: get(detailFav) });
					set_text(text_19, get(detailFav) ? 'Favorit ✓' : 'Favorisieren');
				},
				[() => bg(get(d).id)]
			);

			delegated('click', div_47, closeDetail);
			delegated('click', div_48, (e) => e.stopPropagation());
			delegated('click', button_36, () => $$props.manager.toggleFavorite(get(d).id));
			delegated('keydown', input_6, (e) => e.key === 'Enter' && commitTag());
			event('blur', input_6, commitTag);
			bind_value(input_6, () => get(tagInput), ($$value) => set(tagInput, $$value));
			delegated('click', button_40, () => openEffects(get(d)));
			delegated('click', button_41, deleteFromDetail);
			delegated('click', button_42, closeDetail);
			append($$anchor, div_47);
		};

		if_block(node_63, ($$render) => {
			if (get(detailItem)) $$render(consequent_41);
		});
	}

	template_effect(() => {
		classes = set_class(div, 1, 'picker svelte-1lk0sb9', null, classes, { pinned: get(pinned) });
		set_attribute(div, 'data-mode', get(mode));
		set_attribute(div, 'data-side', get(side));
		set_style(div, `--tile-size:${wpState.value.tileSize ?? ''}px;--tile-radius:${wpState.value.tileRadius ?? ''}px;--wall-grid:${get(wallGrid) ?? ''};--slices-skew:${wpState.value.slicesSkew ?? ''}deg;--slices-aspect:24 / ${wpState.value.slicesHeight ?? ''};--depth-tilt:${wpState.value.depthTilt ?? ''}deg;`);
		set_attribute(div_14, 'data-side', get(side));
		classes_13 = set_class(aside_1, 1, 'rail svelte-1lk0sb9', null, classes_13, { shown: get(railShown), scrubbing: get(scrubbing) });
	});

	event('scroll', div_1, (e) => set(hexScrollTop, e.currentTarget.scrollTop, true));
	bind_element_size(div_1, 'clientWidth', ($$value) => set(galleryWidth, $$value));
	bind_element_size(div_1, 'clientHeight', ($$value) => set(galleryHeight, $$value));
	delegated('pointerdown', div_14, startScrub);
	append($$anchor, div);
	pop();
}

delegate([
	'click',
	'keydown',
	'change',
	'pointerdown',
	'pointermove',
	'pointerup'
]);

/** @import { BlurParams, CrossfadeParams, DrawParams, FadeParams, FlyParams, ScaleParams, SlideParams, TransitionConfig } from './public' */


/** @param {number} x */
const linear = (x) => x;

/** @param {number} t */
function cubic_out(t) {
	const f = t - 1.0;
	return f * f * f + 1.0;
}

/** @param {number | string} value
 * @returns {[number, string]}
 */
function split_css_unit(value) {
	const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
	return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
}

/**
 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
 *
 * @param {Element} node
 * @param {FadeParams} [params]
 * @returns {TransitionConfig}
 */
function fade(node, { delay = 0, duration = 400, easing = linear } = {}) {
	const o = +getComputedStyle(node).opacity;
	return {
		delay,
		duration,
		easing,
		css: (t) => `opacity: ${t * o}`
	};
}

/**
 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
 *
 * @param {Element} node
 * @param {FlyParams} [params]
 * @returns {TransitionConfig}
 */
function fly(
	node,
	{ delay = 0, duration = 400, easing = cubic_out, x = 0, y = 0, opacity = 0 } = {}
) {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;
	const od = target_opacity * (1 - opacity);
	const [x_value, x_unit] = split_css_unit(x);
	const [y_value, y_unit] = split_css_unit(y);
	return {
		delay,
		duration,
		easing,
		css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x_value}${x_unit}, ${(1 - t) * y_value}${y_unit});
			opacity: ${target_opacity - od * u}`
	};
}

/*
Adapted from https://github.com/mattdesl
Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
*/


/**
 * Cubic scaling, decelerate towards end.
 *
 * @param {number} t
 * @returns {number}
 */
function cubicOut(t) {
	const f = t - 1.0;
	return f * f * f + 1.0;
}

var root = from_html(`<button class="skip svelte-zd540h">Überspringen</button>`);
var root_1 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><g class="spin svelte-zd540h" style="transform-origin:130px 105px"><ellipse cx="130" cy="105" rx="96" ry="60" class="ring svelte-zd540h"></ellipse><circle cx="226" cy="105" r="5" class="dot accent svelte-zd540h"></circle><circle cx="34" cy="105" r="3.5" class="dot svelte-zd540h"></circle></g><g class="float svelte-zd540h"><rect x="97" y="40" width="66" height="130" rx="16" class="phone svelte-zd540h"></rect><rect x="104" y="47" width="52" height="116" rx="10" fill="url(#skwdGrad)" class="svelte-zd540h"></rect><circle cx="130" cy="92" r="17" class="gloss svelte-zd540h"></circle><rect x="116" y="150" width="28" height="5" rx="2.5" class="bar svelte-zd540h"></rect></g></svg>`);
var root_2 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><rect x="60" y="30" width="140" height="150" rx="18" class="phone svelte-zd540h"></rect><rect x="68" y="38" width="124" height="134" rx="12" fill="url(#skwdGradSoft)" class="svelte-zd540h"></rect><g class="slidein svelte-zd540h"><path d="M150 60 L182 66 L182 150 L150 156 Z" class="rail svelte-zd540h"></path><circle cx="166" cy="84" r="5" class="dot accent svelte-zd540h"></circle><circle cx="166" cy="105" r="5" class="dot light svelte-zd540h"></circle><circle cx="166" cy="126" r="5" class="dot light svelte-zd540h"></circle></g><circle cx="150" cy="105" r="12" class="touch svelte-zd540h"></circle><circle cx="150" cy="105" r="12" class="touch ping svelte-zd540h"></circle></svg>`);
var root_3 = from_svg(`<rect width="28" height="28" rx="6" fill="url(#skwdGrad)" class="tile svelte-zd540h"></rect>`);
var root_4 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><g class="float svelte-zd540h"><rect x="150" y="70" width="80" height="80" rx="12" class="phone svelte-zd540h"></rect><!></g><g class="chips svelte-zd540h"><g class="chip svelte-zd540h" style="animation-delay:0ms"><circle cx="46" cy="58" r="18" class="src svelte-zd540h"></circle><path d="M46 51 L46 65 M40 57 L46 51 L52 57" class="ico svelte-zd540h"></path></g><g class="chip svelte-zd540h" style="animation-delay:200ms"><circle cx="46" cy="105" r="18" class="src svelte-zd540h"></circle><path d="M39 107 a7 7 0 0 1 14 0 h2 a5 5 0 0 1 0 10 h-18 a5 5 0 0 1 0 -10 z" class="ico fill svelte-zd540h"></path></g><g class="chip svelte-zd540h" style="animation-delay:400ms"><circle cx="46" cy="152" r="18" class="src svelte-zd540h"></circle><path d="M38 148 h6 l2 -3 h8 v14 h-16 z" class="ico fill svelte-zd540h"></path></g></g><path d="M64 58 C110 58 120 105 150 100" class="flow svelte-zd540h"></path><path d="M64 105 C110 105 120 105 150 110" class="flow svelte-zd540h" style="animation-delay:600ms"></path><path d="M64 152 C110 152 120 110 150 120" class="flow svelte-zd540h" style="animation-delay:1200ms"></path></svg>`);
var root_5 = from_svg(`<rect width="17" height="25" rx="3" fill="url(#skwdGrad)" class="svelte-zd540h"></rect>`);
var root_6 = from_svg(`<polygon fill="url(#skwdGrad)" stroke="color-mix(in srgb, var(--bg) 60%, transparent)" stroke-width="1.5" class="svelte-zd540h"></polygon>`);
var root_7 = from_svg(`<rect x="100" y="38" width="60" height="12" rx="3" fill="url(#skwdGrad)" opacity="0.55" class="svelte-zd540h"></rect><rect x="100" y="54" width="60" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.75" class="svelte-zd540h"></rect><rect x="100" y="76" width="60" height="58" rx="6" fill="url(#skwdGrad)" class="svelte-zd540h"></rect><rect x="100" y="140" width="60" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.75" class="svelte-zd540h"></rect><rect x="100" y="160" width="60" height="12" rx="3" fill="url(#skwdGrad)" opacity="0.55" class="svelte-zd540h"></rect>`, 1);
var root_8 = from_svg(`<rect x="118" y="34" width="24" height="18" rx="3" fill="url(#skwdGrad)" opacity="0.4" class="svelte-zd540h"></rect><rect x="112" y="56" width="36" height="26" rx="4" fill="url(#skwdGrad)" opacity="0.65" class="svelte-zd540h"></rect><rect x="102" y="86" width="56" height="44" rx="6" fill="url(#skwdGrad)" class="svelte-zd540h"></rect><rect x="112" y="134" width="36" height="26" rx="4" fill="url(#skwdGrad)" opacity="0.65" class="svelte-zd540h"></rect><rect x="118" y="164" width="24" height="16" rx="3" fill="url(#skwdGrad)" opacity="0.4" class="svelte-zd540h"></rect>`, 1);
var root_9 = from_svg(`<rect x="146" width="14" height="28" rx="3" fill="url(#skwdGrad)" opacity="0.7" class="svelte-zd540h"></rect>`);
var root_10 = from_svg(`<rect x="100" y="40" width="42" height="130" rx="6" fill="url(#skwdGrad)" class="svelte-zd540h"></rect><!>`, 1);
var root_11 = from_svg(`<rect x="120" y="70" width="20" height="60" rx="5" fill="url(#skwdGrad)" class="svelte-zd540h"></rect>`);
var root_12 = from_svg(`<rect x="108" width="44" height="78" rx="6" fill="url(#skwdGrad)" class="svelte-zd540h"></rect>`);
var root_13 = from_svg(`<g class="svelte-zd540h"><!></g>`);
var root_14 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><g class="float svelte-zd540h"><rect x="90" y="20" width="80" height="170" rx="16" class="phone svelte-zd540h"></rect><clipPath id="vClip" class="svelte-zd540h"><rect x="96" y="26" width="68" height="158" rx="10" class="svelte-zd540h"></rect></clipPath><g clip-path="url(#vClip)" class="svelte-zd540h"><rect x="96" y="26" width="68" height="158" fill="url(#skwdGradSoft)" class="svelte-zd540h"></rect><!></g></g></svg>`);
var root_15 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><rect x="48" y="55" width="100" height="100" rx="14" fill="url(#skwdGradSoft)" class="xf a svelte-zd540h"></rect><rect x="112" y="55" width="100" height="100" rx="14" fill="url(#skwdGrad)" class="xf b svelte-zd540h"></rect><g class="float svelte-zd540h"><path d="M126 105 h18 m-6 -6 l6 6 l-6 6" class="arrow svelte-zd540h"></path></g></svg>`);
var root_16 = from_svg(`<rect width="10" height="10" rx="2.5" class="appdot svelte-zd540h"></rect>`);
var root_17 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><g class="spin svelte-zd540h" style="transform-origin:130px 105px"><ellipse cx="130" cy="105" rx="82" ry="72" class="ring svelte-zd540h"></ellipse></g><g class="float svelte-zd540h"><rect x="92" y="26" width="76" height="158" rx="17" class="phone svelte-zd540h"></rect><clipPath id="mClip" class="svelte-zd540h"><rect x="98" y="32" width="64" height="146" rx="12" class="svelte-zd540h"></rect></clipPath><g clip-path="url(#mClip)" class="svelte-zd540h"><rect x="98" y="32" width="64" height="146" fill="url(#skwdGradSoft)" class="svelte-zd540h"></rect><path class="wave svelte-zd540h" d="M94 120 q16 -15 32 0 t32 0 t32 0 V178 H94 Z" fill="url(#skwdGrad)" opacity="0.92"></path><path class="wave w2 svelte-zd540h" d="M94 134 q16 -13 32 0 t32 0 t32 0 V178 H94 Z" fill="url(#skwdGrad)" opacity="0.5"></path></g><rect x="121" y="36" width="18" height="4" rx="2" class="notch svelte-zd540h"></rect><rect x="119" y="170" width="22" height="3" rx="1.5" class="notch svelte-zd540h"></rect><!></g></svg>`);
var root_18 = from_svg(`<svg viewBox="0 0 260 210" class="il svelte-zd540h"><g class="spin svelte-zd540h" style="transform-origin:130px 105px"><ellipse cx="130" cy="105" rx="80" ry="80" class="ring svelte-zd540h"></ellipse></g><circle cx="130" cy="105" r="46" fill="url(#skwdGrad)" class="float svelte-zd540h"></circle><path d="M110 106 l14 14 l26 -30" class="check svelte-zd540h"></path></svg>`);
var root_19 = from_html(`<div class="art svelte-zd540h"><!></div>`);
var root_20 = from_html(`<button> </button>`);
var root_21 = from_html(`<div class="chips-grid svelte-zd540h"></div>`);
var root_22 = from_html(`<span class="gpu svelte-zd540h">✦</span>`);
var root_23 = from_html(`<button> <!></button>`);
var root_24 = from_html(`<div class="trans-grid svelte-zd540h"></div>`);
var root_25 = from_html(`<div class="toggles svelte-zd540h"><button><span class="t-text svelte-zd540h"><span class="t-title svelte-zd540h">Zufällige Übergänge</span> <span class="t-desc svelte-zd540h">Bei jedem Wechsel ein anderer Effekt – immer für Abwechslung.</span></span> <span class="sw svelte-zd540h" aria-hidden="true"><span class="knob svelte-zd540h"></span></span></button> <!></div>`);
var root_26 = from_html(`<div class="toggles svelte-zd540h"><button><span class="t-text svelte-zd540h"><span class="t-title svelte-zd540h">Hintergrund aufs Handy setzen</span> <span class="t-desc svelte-zd540h">Dein Motiv als System-Hintergrund (Start- & Sperrbildschirm).</span></span> <span class="sw svelte-zd540h" aria-hidden="true"><span class="knob svelte-zd540h"></span></span></button> <button><span class="t-text svelte-zd540h"><span class="t-title svelte-zd540h">Live-Wallpaper (animiert)</span> <span class="t-desc svelte-zd540h">Sanfte Übergänge & automatischer Wechsel direkt am Homescreen.</span></span> <span class="sw svelte-zd540h" aria-hidden="true"><span class="knob svelte-zd540h"></span></span></button></div>`);
var root_27 = from_html(`<div class="svelte-zd540h"><span class="kicker svelte-zd540h"> </span> <h1 class="svelte-zd540h"> </h1> <p class="svelte-zd540h"> </p> <!> <!> <!></div>`);
var root_28 = from_html(`<button></button>`);
var root_29 = from_html(`<button class="ghost svelte-zd540h">Zurück</button>`);
var root_30 = from_html(`<svg class="defs svelte-zd540h" aria-hidden="true" focusable="false"><defs class="svelte-zd540h"><linearGradient id="skwdGrad" x1="0" y1="0" x2="1" y2="1" class="svelte-zd540h"><stop offset="0" class="g0 svelte-zd540h"></stop><stop offset="1" class="g1 svelte-zd540h"></stop></linearGradient><linearGradient id="skwdGradSoft" x1="0" y1="0" x2="0" y2="1" class="svelte-zd540h"><stop offset="0" class="gs0 svelte-zd540h"></stop><stop offset="1" class="gs1 svelte-zd540h"></stop></linearGradient></defs></svg> <div class="intro svelte-zd540h"><div class="aurora a1 svelte-zd540h"></div> <div class="aurora a2 svelte-zd540h"></div> <!> <div class="stage svelte-zd540h"><!></div> <div class="copy svelte-zd540h"><!></div> <div class="footer svelte-zd540h"><div class="dots svelte-zd540h"></div> <div class="actions svelte-zd540h"><!> <button class="go svelte-zd540h"> </button></div></div></div>`, 1);

const $$css = {
	hash: 'svelte-zd540h',
	code: '.defs.svelte-zd540h {position:absolute;width:0;height:0;}.g0.svelte-zd540h {stop-color:var(--accent, #6aa0ff);}.g1.svelte-zd540h {stop-color:color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0);}.gs0.svelte-zd540h {stop-color:color-mix(in srgb, var(--accent, #6aa0ff) 45%, transparent);}.gs1.svelte-zd540h {stop-color:color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent);}.intro.svelte-zd540h {position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;overflow:hidden;color:var(--text, #fff);background:radial-gradient(130% 80% at 50% -10%, color-mix(in srgb, var(--accent, #6aa0ff) 22%, transparent), transparent 60%),\n      var(--bg, #0e0f13);padding:calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 24px);}.aurora.svelte-zd540h {position:absolute;border-radius:50%;filter:blur(60px);opacity:0.5;pointer-events:none;}.a1.svelte-zd540h {width:320px;height:320px;top:-80px;right:-120px;background:radial-gradient(circle, color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent), transparent 70%); animation: svelte-zd540h-drift1 14s ease-in-out infinite;}.a2.svelte-zd540h {width:300px;height:300px;bottom:-100px;left:-120px;background:radial-gradient(circle, color-mix(in srgb, #b06cf0 55%, transparent), transparent 70%); animation: svelte-zd540h-drift2 18s ease-in-out infinite;}\n  @keyframes svelte-zd540h-drift1 { 50% { transform: translate(-30px, 40px) scale(1.1); } }\n  @keyframes svelte-zd540h-drift2 { 50% { transform: translate(40px, -30px) scale(1.08); } }.skip.svelte-zd540h {position:absolute;top:calc(env(safe-area-inset-top) + 16px);right:20px;z-index:2;background:color-mix(in srgb, var(--text, #fff) 8%, transparent);border:none;color:var(--text-muted, #c7c9d1);font-size:0.82rem;padding:7px 14px;border-radius:999px;backdrop-filter:blur(6px);cursor:pointer;}.skip.svelte-zd540h:active {transform:scale(0.96);}.stage.svelte-zd540h {flex:1;display:grid;place-items:center;position:relative;min-height:0;}.art.svelte-zd540h {grid-area:1 / 1;}.il.svelte-zd540h {width:min(66vw, 260px);height:auto;overflow:visible;}.copy.svelte-zd540h {position:relative;text-align:center;padding:4px 4px 10px;}.kicker.svelte-zd540h {display:inline-block;font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent, #6aa0ff);font-weight:700;margin-bottom:10px;}h1.svelte-zd540h {margin:0 0 12px;font-size:clamp(1.4rem, 6.5vw, 1.9rem);line-height:1.12;letter-spacing:-0.02em;font-weight:800;}p.svelte-zd540h {margin:0 auto;max-width:30rem;color:var(--text-muted, #c7c9d1);line-height:1.55;font-size:0.95rem;}.chips-grid.svelte-zd540h {display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:18px auto 0;max-width:30rem;}.chip-opt.svelte-zd540h {background:color-mix(in srgb, var(--text, #fff) 6%, transparent);border:1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);color:var(--text, #fff);border-radius:999px;padding:9px 16px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:background 0.18s, border-color 0.18s, transform 0.1s;}.chip-opt.svelte-zd540h:active {transform:scale(0.96);}.chip-opt.sel.svelte-zd540h {background:var(--accent, #6aa0ff);color:#fff;border-color:transparent;}.chip-opt.sm.svelte-zd540h {padding:7px 12px;font-size:0.82rem;}.gpu.svelte-zd540h {margin-left:4px;opacity:0.8;font-size:0.75em;}.trans-grid.svelte-zd540h {display:flex;flex-wrap:wrap;justify-content:center;gap:7px;max-width:30rem;max-height:136px;overflow-y:auto;padding:2px;-webkit-overflow-scrolling:touch;}.toggles.svelte-zd540h {display:flex;flex-direction:column;gap:10px;margin:18px auto 0;max-width:30rem;text-align:left;}.toggle.svelte-zd540h {display:flex;align-items:center;gap:14px;background:color-mix(in srgb, var(--text, #fff) 6%, transparent);border:1px solid color-mix(in srgb, var(--text, #fff) 12%, transparent);border-radius:16px;padding:14px 16px;cursor:pointer;transition:border-color 0.2s, background 0.2s;}.toggle.on.svelte-zd540h {border-color:color-mix(in srgb, var(--accent, #6aa0ff) 60%, transparent);background:color-mix(in srgb, var(--accent, #6aa0ff) 12%, transparent);}.toggle.disabled.svelte-zd540h {opacity:0.45;cursor:default;}.t-text.svelte-zd540h {flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;}.t-title.svelte-zd540h {font-weight:700;font-size:0.95rem;}.t-desc.svelte-zd540h {font-size:0.8rem;color:var(--text-muted, #c7c9d1);line-height:1.4;}.sw.svelte-zd540h {flex-shrink:0;width:46px;height:28px;border-radius:999px;background:color-mix(in srgb, var(--text, #fff) 20%, transparent);position:relative;transition:background 0.2s;}.toggle.on.svelte-zd540h .sw:where(.svelte-zd540h) {background:var(--accent, #6aa0ff);}.knob.svelte-zd540h {position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform 0.22s cubic-bezier(.2,.8,.2,1);}.toggle.on.svelte-zd540h .knob:where(.svelte-zd540h) {transform:translateX(18px);}.footer.svelte-zd540h {position:relative;z-index:2;}.dots.svelte-zd540h {display:flex;justify-content:center;gap:8px;margin:18px 0 20px;}.dot-btn.svelte-zd540h {width:7px;height:7px;padding:0;border:none;border-radius:999px;background:color-mix(in srgb, var(--text, #fff) 22%, transparent);transition:width 0.3s cubic-bezier(.2,.8,.2,1), background 0.3s;cursor:pointer;}.dot-btn.on.svelte-zd540h {width:24px;background:var(--accent, #6aa0ff);}.actions.svelte-zd540h {display:flex;gap:10px;}.ghost.svelte-zd540h, .go.svelte-zd540h {height:52px;border-radius:15px;font-size:1rem;font-weight:700;cursor:pointer;transition:transform 0.12s, filter 0.2s;}.ghost.svelte-zd540h {flex:0 0 auto;padding:0 22px;background:color-mix(in srgb, var(--text, #fff) 9%, transparent);border:1px solid color-mix(in srgb, var(--text, #fff) 14%, transparent);color:var(--text, #fff);}.go.svelte-zd540h {flex:1;border:none;color:#fff;background:linear-gradient(135deg, var(--accent, #6aa0ff), color-mix(in srgb, var(--accent, #6aa0ff) 55%, #b06cf0));box-shadow:0 10px 30px color-mix(in srgb, var(--accent, #6aa0ff) 40%, transparent);}.go.svelte-zd540h:active, .ghost.svelte-zd540h:active {transform:scale(0.98);}.phone.svelte-zd540h {fill:color-mix(in srgb, var(--text, #fff) 7%, transparent);stroke:color-mix(in srgb, var(--text, #fff) 20%, transparent);stroke-width:2;}.ring.svelte-zd540h {fill:none;stroke:color-mix(in srgb, var(--text, #fff) 16%, transparent);stroke-width:1.5;stroke-dasharray:2 7;stroke-linecap:round;}.dot.svelte-zd540h {fill:color-mix(in srgb, var(--text, #fff) 40%, transparent);}.dot.accent.svelte-zd540h {fill:var(--accent, #6aa0ff);}.dot.light.svelte-zd540h {fill:color-mix(in srgb, var(--text, #fff) 55%, transparent);}.gloss.svelte-zd540h {fill:color-mix(in srgb, #fff 30%, transparent);}.bar.svelte-zd540h {fill:color-mix(in srgb, #fff 55%, transparent);}.rail.svelte-zd540h {fill:color-mix(in srgb, var(--accent, #6aa0ff) 85%, #000);}.touch.svelte-zd540h {fill:none;stroke:#fff;stroke-width:2;opacity:0.9;}.src.svelte-zd540h {fill:color-mix(in srgb, var(--text, #fff) 10%, transparent);stroke:color-mix(in srgb, var(--text, #fff) 22%, transparent);stroke-width:1.5;}.ico.svelte-zd540h {fill:none;stroke:var(--accent, #6aa0ff);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}.ico.fill.svelte-zd540h {fill:var(--accent, #6aa0ff);stroke:none;}.tile.svelte-zd540h {opacity:0; animation: svelte-zd540h-pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards;}.flow.svelte-zd540h {fill:none;stroke:var(--accent, #6aa0ff);stroke-width:2;stroke-dasharray:5 9;stroke-linecap:round;opacity:0.8; animation: svelte-zd540h-dashmove 1.1s linear infinite;}.appdot.svelte-zd540h {fill:color-mix(in srgb, #fff 45%, transparent);}.notch.svelte-zd540h {fill:color-mix(in srgb, var(--text, #fff) 30%, transparent);}.check.svelte-zd540h {fill:none;stroke:#fff;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:70;stroke-dashoffset:70; animation: svelte-zd540h-draw 0.6s 0.2s cubic-bezier(.2,.8,.2,1) forwards;}.xf.svelte-zd540h {stroke:color-mix(in srgb, var(--text, #fff) 16%, transparent);stroke-width:1.5;}.xf.a.svelte-zd540h { animation: svelte-zd540h-xfa 3s ease-in-out infinite;}.xf.b.svelte-zd540h { animation: svelte-zd540h-xfb 3s ease-in-out infinite;}.arrow.svelte-zd540h {fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}\n  @keyframes svelte-zd540h-xfa { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }\n  @keyframes svelte-zd540h-xfb { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }.float.svelte-zd540h { animation: svelte-zd540h-floaty 5s ease-in-out infinite;transform-origin:center;}.spin.svelte-zd540h { animation: svelte-zd540h-spin 22s linear infinite;}.chip.svelte-zd540h {opacity:0; animation: svelte-zd540h-pop 0.5s cubic-bezier(.2,.9,.3,1.3) forwards;}.slidein.svelte-zd540h { animation: svelte-zd540h-slidein 0.7s cubic-bezier(.2,.8,.2,1) both;}.ping.svelte-zd540h { animation: svelte-zd540h-ping 1.8s ease-out infinite;transform-origin:150px 105px;}.wave.svelte-zd540h { animation: svelte-zd540h-waveshift 3.5s ease-in-out infinite;}\n\n  @keyframes svelte-zd540h-floaty { 50% { transform: translateY(-8px); } }\n  @keyframes svelte-zd540h-spin { to { transform: rotate(360deg); } }\n  @keyframes svelte-zd540h-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }\n  @keyframes svelte-zd540h-dashmove { to { stroke-dashoffset: -28; } }\n  @keyframes svelte-zd540h-slidein { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }\n  @keyframes svelte-zd540h-ping { 0% { transform: scale(1); opacity: 0.7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }\n  @keyframes svelte-zd540h-livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }\n  @keyframes svelte-zd540h-waveshift { 50% { transform: translateX(-12px) translateY(-3px); } }\n  @keyframes svelte-zd540h-draw { to { stroke-dashoffset: 0; } }\n\n  @media (prefers-reduced-motion: reduce) {.float.svelte-zd540h, .spin.svelte-zd540h, .chip.svelte-zd540h, .slidein.svelte-zd540h, .ping.svelte-zd540h, .wave.svelte-zd540h, .tile.svelte-zd540h, .flow.svelte-zd540h, .aurora.svelte-zd540h, .check.svelte-zd540h, .xf.svelte-zd540h { animation: none !important;}.xf.b.svelte-zd540h {opacity:1;}.tile.svelte-zd540h, .chip.svelte-zd540h {opacity:1;}.check.svelte-zd540h {stroke-dashoffset:0;}\n  }'
};

function Intro($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css);

	const steps = [
		{
			kind: 'info',
			kicker: 'Willkommen',
			title: 'SKWD Wall',
			body: 'Sammle, gestalte und erlebe deine Hintergründe neu. SKWD Wall macht aus deinem Startbildschirm eine Bühne – kuratiert von dir, abgestimmt bis auf die Farbe.'
		},

		{
			kind: 'info',
			kicker: 'Steuerung',
			title: 'Alles in einer Wischgeste',
			body: 'Zieh vom Bildschirmrand nach innen – die Leiste gleitet herein. Hinzufügen, Sortieren, Favoriten, Farbe und Hell/Dunkel sind immer einen Wisch entfernt und verschwinden von selbst wieder.'
		},

		{
			kind: 'info',
			kicker: 'Deine Motive',
			title: 'Alle Quellen, eine Galerie',
			body: 'Eigene Fotos und Videos, Millionen Motive aus Wallhaven oder ein ganzer Ordner deines Geräts – alles an einem Ort. Ordner werden verknüpft, nicht kopiert.'
		},

		{
			kind: 'view',
			kicker: 'Ansicht',
			title: 'Wähle deinen Look',
			body: 'Wie soll deine Galerie aussehen? Vom klassischen Raster über Wabenmuster bis zum Kartenfächer – jederzeit änderbar.'
		},

		{
			kind: 'transition',
			kicker: 'Animation',
			title: 'Übergänge beim Wechsel',
			body: 'Wie soll der Wechsel zwischen Wallpapern aussehen? Lass den Zufall entscheiden oder wähle einen festen Effekt.'
		},

		{
			kind: 'mobile',
			kicker: 'Einrichten',
			title: 'Dein Handy mit einbeziehen',
			body: 'SKWD Wall kann dein gewähltes Motiv direkt auf den Startbildschirm bringen. Das ist standardmäßig aus – aktiviere nur, was du möchtest. Später jederzeit änderbar unter Einstellungen → Geräte.'
		},

		{
			kind: 'done',
			kicker: 'Fertig',
			title: 'Startklar',
			body: 'Alles bereit. Füge dein erstes Wallpaper über die Leiste hinzu – und mach deinen Startbildschirm zu deinem.'
		}
	];

	let i = state(0);
	let step = user_derived(() => steps[get(i)]);
	let last = user_derived(() => get(i) === steps.length - 1);
	const pad = (n) => String(n + 1).padStart(2, '0');

	// Interactive setup state, applied immediately to the plugin.
	let mobileOn = state(proxy($$props.manager.state.get().deviceMobile));

	let liveOn = state(proxy($$props.manager.state.get().liveWallpaper));
	let viewMode = state(proxy($$props.manager.state.get().viewMode));
	let randomShader = state(proxy($$props.manager.state.get().randomShader));
	let transitionType = state(proxy($$props.manager.state.get().transitionType));

	function setView(m) {
		set(viewMode, m, true);
		$$props.manager.setViewMode(m);
	}

	function setRandomShader(on) {
		set(randomShader, on, true);
		$$props.manager.setField('randomShader', on);
	}

	function setTransition(t) {
		set(transitionType, t, true);
		$$props.manager.setTransitionType(t);
	}

	function setMobile(on) {
		set(mobileOn, on, true);
		$$props.manager.setDeviceMobile(on);

		if (!on && get(liveOn)) {
			set(liveOn, false);
			$$props.manager.setLiveWallpaper(false);
		}
	}

	function setLive(on) {
		set(liveOn, on, true);
		$$props.manager.setLiveWallpaper(on);
	}

	// Pointy-top hexagon points for the "geometric" preview.
	function hex(cx, cy, r) {
		const w = r * 0.866;

		return `${cx},${cy - r} ${cx + w},${cy - r / 2} ${cx + w},${cy + r / 2} ${cx},${cy + r} ${cx - w},${cy + r / 2} ${cx - w},${cy - r / 2}`;
	}

	function next() {
		if (get(last)) {
			// If the user enabled live wallpaper in the setup, activate it right away
			// (open Android's live-wallpaper chooser) instead of making them hunt in
			// settings. No-op where unsupported (web/desktop).
			if (get(liveOn)) $$props.manager.openLivePicker();

			$$props.onDone();
		} else {
			set(i, get(i) + 1);
		}
	}

	function back() {
		if (get(i) > 0) set(i, get(i) - 1);
	}

	var fragment = root_30();
	var div = sibling(first_child(fragment), 2);
	var node = sibling(child(div), 4);

	{
		var consequent = ($$anchor) => {
			var button = root();

			delegated('click', button, function (...$$args) {
				$$props.onDone?.apply(this, $$args);
			});

			append($$anchor, button);
		};

		if_block(node, ($$render) => {
			if (!get(last)) $$render(consequent);
		});
	}

	var div_1 = sibling(node, 2);
	var node_1 = child(div_1);

	key(node_1, () => get(i), ($$anchor) => {
		var div_2 = root_19();
		var node_2 = child(div_2);

		{
			var consequent_1 = ($$anchor) => {
				var svg = root_1();

				append($$anchor, svg);
			};

			var consequent_2 = ($$anchor) => {
				var svg_1 = root_2();

				append($$anchor, svg_1);
			};

			var consequent_3 = ($$anchor) => {
				var svg_2 = root_4();
				var g = child(svg_2);
				var node_3 = sibling(child(g));

				each(node_3, 16, () => [0, 1, 2, 3], index, ($$anchor, k) => {
					var rect = root_3();

					template_effect(
						($0) => {
							set_attribute(rect, 'x', 158 + k % 2 * 34);
							set_attribute(rect, 'y', $0);
							set_style(rect, `animation-delay:${k * 120}ms`);
						},
						[() => 78 + Math.floor(k / 2) * 34]
					);

					append($$anchor, rect);
				});
				append($$anchor, svg_2);
			};

			var consequent_10 = ($$anchor) => {
				var svg_3 = root_14();
				var g_1 = child(svg_3);
				var g_2 = sibling(child(g_1), 2);
				var node_4 = sibling(child(g_2));

				key(node_4, () => get(viewMode), ($$anchor) => {
					var g_3 = root_13();
					var node_5 = child(g_3);

					{
						var consequent_4 = ($$anchor) => {
							var fragment_1 = comment();
							var node_6 = first_child(fragment_1);

							each(node_6, 16, () => [0, 1, 2], index, ($$anchor, c) => {
								var fragment_2 = comment();
								var node_7 = first_child(fragment_2);

								each(node_7, 16, () => [0, 1, 2, 3, 4], index, ($$anchor, r) => {
									var rect_1 = root_5();

									template_effect(() => {
										set_attribute(rect_1, 'x', 100 + c * 21);
										set_attribute(rect_1, 'y', 31 + r * 30);
									});

									append($$anchor, rect_1);
								});

								append($$anchor, fragment_2);
							});

							append($$anchor, fragment_1);
						};

						var consequent_5 = ($$anchor) => {
							var fragment_3 = comment();
							var node_8 = first_child(fragment_3);

							each(
								node_8,
								16,
								() => [
									[116, 44],
									[144, 44],
									[130, 68],
									[116, 92],
									[144, 92],
									[130, 116],
									[116, 140],
									[144, 140],
									[130, 164]
								],
								index,
								($$anchor, $$item) => {
									var $$array = user_derived(() => to_array($$item, 2));
									let cx = () => get($$array)[0];
									let cy = () => get($$array)[1];
									var polygon = root_6();

									template_effect(($0) => set_attribute(polygon, 'points', $0), [() => hex(cx(), cy(), 13)]);
									append($$anchor, polygon);
								}
							);

							append($$anchor, fragment_3);
						};

						var consequent_6 = ($$anchor) => {
							var fragment_4 = root_7();
							append($$anchor, fragment_4);
						};

						var consequent_7 = ($$anchor) => {
							var fragment_5 = root_8();
							append($$anchor, fragment_5);
						};

						var consequent_8 = ($$anchor) => {
							var fragment_6 = root_10();
							var node_9 = sibling(first_child(fragment_6));

							each(node_9, 16, () => [0, 1, 2, 3], index, ($$anchor, r) => {
								var rect_2 = root_9();

								template_effect(() => set_attribute(rect_2, 'y', 40 + r * 34));
								append($$anchor, rect_2);
							});

							append($$anchor, fragment_6);
						};

						var consequent_9 = ($$anchor) => {
							var fragment_7 = comment();
							var node_10 = first_child(fragment_7);

							each(node_10, 16, () => [-28, -14, 0, 14, 28], index, ($$anchor, a, k) => {
								var rect_3 = root_11();

								set_attribute(rect_3, 'opacity', k === 2 ? 1 : 0.6);
								template_effect(() => set_attribute(rect_3, 'transform', `rotate(${a} 130 130)`));
								append($$anchor, rect_3);
							});

							append($$anchor, fragment_7);
						};

						var alternate = ($$anchor) => {
							var fragment_8 = comment();
							var node_11 = first_child(fragment_8);

							each(node_11, 16, () => [10, 5, 0], index, ($$anchor, a, k) => {
								var rect_4 = root_12();

								set_attribute(rect_4, 'y', 60 + k * 6);
								set_attribute(rect_4, 'opacity', 0.55 + k * 0.22);
								template_effect(() => set_attribute(rect_4, 'transform', `rotate(${a} 130 100)`));
								append($$anchor, rect_4);
							});

							append($$anchor, fragment_8);
						};

						if_block(node_5, ($$render) => {
							if (get(viewMode) === 'wall') $$render(consequent_4); else if (get(viewMode) === 'geometric') $$render(consequent_5, 1); else if (get(viewMode) === 'slices') $$render(consequent_6, 2); else if (get(viewMode) === 'depth') $$render(consequent_7, 3); else if (get(viewMode) === 'sandy') $$render(consequent_8, 4); else if (get(viewMode) === 'hand') $$render(consequent_9, 5); else $$render(alternate, -1);
						});
					}
					transition(1, g_3, () => fade, () => ({ duration: 260 }));
					append($$anchor, g_3);
				});
				append($$anchor, svg_3);
			};

			var consequent_11 = ($$anchor) => {
				var svg_4 = root_15();

				append($$anchor, svg_4);
			};

			var consequent_12 = ($$anchor) => {
				var svg_5 = root_17();
				var g_4 = sibling(child(svg_5));
				var node_12 = sibling(child(g_4), 5);

				each(node_12, 16, () => [0, 1, 2, 3, 4, 5], index, ($$anchor, k) => {
					var rect_5 = root_16();

					template_effect(
						($0) => {
							set_attribute(rect_5, 'x', 110 + k % 3 * 15);
							set_attribute(rect_5, 'y', $0);
						},
						[() => 50 + Math.floor(k / 3) * 14]
					);

					append($$anchor, rect_5);
				});
				append($$anchor, svg_5);
			};

			var alternate_1 = ($$anchor) => {
				var svg_6 = root_18();

				append($$anchor, svg_6);
			};

			if_block(node_2, ($$render) => {
				if (get(i) === 0) $$render(consequent_1); else if (get(i) === 1) $$render(consequent_2, 1); else if (get(i) === 2) $$render(consequent_3, 2); else if (get(step).kind === 'view') $$render(consequent_10, 3); else if (get(step).kind === 'transition') $$render(consequent_11, 4); else if (get(step).kind === 'mobile') $$render(consequent_12, 5); else $$render(alternate_1, -1);
			});
		}
		transition(1, div_2, () => fade, () => ({ duration: 420 }));
		append($$anchor, div_2);
	});

	var div_3 = sibling(div_1, 2);
	var node_13 = child(div_3);

	key(node_13, () => get(i), ($$anchor) => {
		var div_4 = root_27();
		var span = child(div_4);
		var text = only_child(span);
		var h1 = sibling(span, 2);
		var text_1 = only_child(h1, true);
		var p = sibling(h1, 2);
		var text_2 = only_child(p, true);
		var node_14 = sibling(p, 2);

		{
			var consequent_13 = ($$anchor) => {
				var div_5 = root_21();

				each(div_5, 21, () => VIEW_MODES, (v) => v.value, ($$anchor, v) => {
					var button_1 = root_20();
					let classes;
					var text_3 = only_child(button_1, true);

					template_effect(() => {
						classes = set_class(button_1, 1, 'chip-opt svelte-zd540h', null, classes, { sel: get(viewMode) === get(v).value });
						set_text(text_3, get(v).label);
					});

					delegated('click', button_1, () => setView(get(v).value));
					append($$anchor, button_1);
				});
				append($$anchor, div_5);
			};

			if_block(node_14, ($$render) => {
				if (get(step).kind === 'view') $$render(consequent_13);
			});
		}

		var node_15 = sibling(node_14, 2);

		{
			var consequent_16 = ($$anchor) => {
				var div_6 = root_25();
				var button_2 = child(div_6);
				let classes_1;
				var node_16 = sibling(button_2, 2);

				{
					var consequent_15 = ($$anchor) => {
						var div_7 = root_24();

						each(div_7, 21, () => TRANSITIONS, (t) => t.value, ($$anchor, t) => {
							var button_3 = root_23();
							let classes_2;
							var text_4 = child(button_3);
							var node_17 = sibling(text_4);

							{
								var consequent_14 = ($$anchor) => {
									var span_1 = root_22();

									append($$anchor, span_1);
								};

								if_block(node_17, ($$render) => {
									if (get(t).gpu) $$render(consequent_14);
								});
							}

							template_effect(() => {
								classes_2 = set_class(button_3, 1, 'chip-opt sm svelte-zd540h', null, classes_2, { sel: get(transitionType) === get(t).value });
								set_text(text_4, get(t).label);
							});

							delegated('click', button_3, () => setTransition(get(t).value));
							append($$anchor, button_3);
						});
						append($$anchor, div_7);
					};

					if_block(node_16, ($$render) => {
						if (!get(randomShader)) $$render(consequent_15);
					});
				}
				template_effect(() => classes_1 = set_class(button_2, 1, 'toggle svelte-zd540h', null, classes_1, { on: get(randomShader) }));
				delegated('click', button_2, () => setRandomShader(!get(randomShader)));
				append($$anchor, div_6);
			};

			if_block(node_15, ($$render) => {
				if (get(step).kind === 'transition') $$render(consequent_16);
			});
		}

		var node_18 = sibling(node_15, 2);

		{
			var consequent_17 = ($$anchor) => {
				var div_8 = root_26();
				var button_4 = child(div_8);
				let classes_3;
				var button_5 = sibling(button_4, 2);
				let classes_4;

				template_effect(() => {
					classes_3 = set_class(button_4, 1, 'toggle svelte-zd540h', null, classes_3, { on: get(mobileOn) });
					classes_4 = set_class(button_5, 1, 'toggle svelte-zd540h', null, classes_4, { on: get(liveOn), disabled: !get(mobileOn) });
					button_5.disabled = !get(mobileOn);
				});

				delegated('click', button_4, () => setMobile(!get(mobileOn)));
				delegated('click', button_5, () => setLive(!get(liveOn)));
				append($$anchor, div_8);
			};

			if_block(node_18, ($$render) => {
				if (get(step).kind === 'mobile') $$render(consequent_17);
			});
		}

		template_effect(
			($0) => {
				set_text(text, `${$0 ?? ''} · ${get(step).kicker ?? ''}`);
				set_text(text_1, get(step).title);
				set_text(text_2, get(step).body);
			},
			[() => pad(get(i))]
		);

		transition(1, div_4, () => fly, () => ({ y: 16, duration: 420, easing: cubicOut }));
		append($$anchor, div_4);
	});

	var div_9 = sibling(div_3, 2);
	var div_10 = child(div_9);

	each(div_10, 21, () => steps, index, ($$anchor, _, n) => {
		var button_6 = root_28();
		let classes_5;

		set_attribute(button_6, 'aria-label', `Schritt ${n + 1}`);
		template_effect(() => classes_5 = set_class(button_6, 1, 'dot-btn svelte-zd540h', null, classes_5, { on: n === get(i) }));
		delegated('click', button_6, () => set(i, n, true));
		append($$anchor, button_6);
	});

	var div_11 = sibling(div_10, 2);
	var node_19 = child(div_11);

	{
		var consequent_18 = ($$anchor) => {
			var button_7 = root_29();

			delegated('click', button_7, back);
			append($$anchor, button_7);
		};

		if_block(node_19, ($$render) => {
			if (get(i) > 0) $$render(consequent_18);
		});
	}

	var button_8 = sibling(node_19, 2);
	var text_5 = only_child(button_8, true);
	template_effect(() => set_text(text_5, get(last) ? 'Loslegen' : 'Weiter'));
	delegated('click', button_8, next);
	append($$anchor, fragment);
	pop();
}

delegate(['click']);

const manifest = {
  id: "skwd-wall",
  name: "SKWD Wall",
  version: "0.1.0",
  description: "SKWD-Wall aufs Handy: Wallpaper-Picker (eigene Bilder + Wallhaven), Ansichts-Modi, Farbschema automatisch aus dem Bild, Übergänge, Live-Wallpaper (nativ). Läuft überall.",
  author: "Sojus",
  main: "index.ts",
  type: "gui",
  // GUI runs everywhere (testable in the browser); native wallpaper-setting
  // (phone) lands in a later block. Kept broad so desktop/web can preview.
  platforms: ["mobile", "desktop", "web"],
  // Powers it uses when present; it degrades gracefully where they're missing
  // (e.g. web can't set the OS wallpaper, a non-Chromium browser has no folders).
  capabilities: ["folders", "wallpaper", "live-wallpaper"],
  news: [
    {
      version: "0.1.0",
      date: "2026-10-09",
      text: "Neuer interaktiver Einrichtungsprozess: Ansicht & Übergänge direkt wählen, Handy-Funktionen per Schalter (standardmäßig aus). Schärferer App-Hintergrund und Hintergrund sofort beim Start gesetzt."
    },
    {
      version: "0.1.0",
      date: "2026-10-08",
      text: "Sieben Ansichtsmodi aus dem SKWD-Original, automatisches Theme aus dem aktiven Bild, Übergänge (inkl. GPU-Shader), Live-Wallpaper (nativ), Ordner-Einbindung und Papierkorb."
    }
  ]
};
const VIEW_ID = "wallpaper-picker";
class PickerView extends View {
  constructor(app, manager) {
    super(app);
    this.manager = manager;
  }
  component = null;
  intro = null;
  getViewType() {
    return VIEW_ID;
  }
  getDisplayName() {
    return "SKWD Wall";
  }
  getIcon() {
    return "image";
  }
  /** Mount the full-screen intro/setup overlay (idempotent). */
  showIntro() {
    if (this.intro) return;
    if (!this.containerEl) {
      requestAnimationFrame(() => this.showIntro());
      return;
    }
    this.intro = mount(Intro, {
      target: this.containerEl,
      props: {
        app: this.app,
        manager: this.manager,
        onDone: () => {
          this.app.config.set("skwd-wall", "introSeen", true);
          if (this.intro) {
            unmount(this.intro);
            this.intro = null;
          }
        }
      }
    });
  }
  async onOpen() {
    this.component = mount(Picker, {
      target: this.containerEl,
      props: {
        app: this.app,
        manager: this.manager
      }
    });
    if (this.app.platform.isMobile && this.app.config.get("skwd-wall", "introSeen") !== true) {
      this.showIntro();
    }
  }
  async onClose() {
    if (this.intro) {
      unmount(this.intro);
      this.intro = null;
    }
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
  }
}
class WallpaperPlugin extends Plugin {
  manager;
  constructor(app, m) {
    super(app, m);
  }
  /** Reset the seen-flag and show the setup on the OPEN view (no close+reopen,
   *  which left an empty tab). Opens the view first if it isn't open. */
  replayIntro() {
    this.app.config.set("skwd-wall", "introSeen", false);
    this.app.workspace.openView(VIEW_ID);
    const v = this.app.workspace.getView(VIEW_ID);
    if (v instanceof PickerView) v.showIntro();
  }
  async onload() {
    this.manager = new WallpaperManager(this.app);
    await this.manager.start();
    this.registerView(VIEW_ID, () => new PickerView(this.app, this.manager));
    this.addNavigationItem({
      id: VIEW_ID,
      name: "SKWD Wall",
      icon: "image",
      priority: 5,
      // The star feature — the sensible default home until the user picks another.
      isStartPage: true
    });
    this.addCommand({
      id: "open",
      name: "SKWD Wall öffnen",
      callback: () => this.app.workspace.openView(VIEW_ID)
    });
    this.addCommand({
      id: "show-intro",
      name: "Einführung anzeigen",
      callback: () => this.replayIntro()
    });
    this.addCommand({
      id: "clear-data",
      name: "Daten löschen",
      callback: () => {
        void this.manager.clearAllData();
        this.replayIntro();
      }
    });
    let settingsComponent = null;
    this.addSettingTab({
      id: "wallpaper-settings",
      name: "SKWD Wall",
      icon: "image",
      render: (el) => {
        settingsComponent = mount(WallpaperSettings, {
          target: el,
          props: { app: this.app, manager: this.manager }
        });
      },
      hide: () => {
        if (settingsComponent) {
          unmount(settingsComponent);
          settingsComponent = null;
        }
      }
    });
  }
  async onunload() {
    this.manager.stop();
  }
}

export { WallpaperPlugin as default, manifest };
