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

const EACH_ITEM_REACTIVE = 1;
const EACH_INDEX_REACTIVE = 1 << 1;
/** See EachBlock interface metadata.is_controlled for an explanation what this is */
const EACH_IS_CONTROLLED = 1 << 2;
const EACH_IS_ANIMATED = 1 << 3;
const EACH_ITEM_IMMUTABLE = 1 << 4;

const TEMPLATE_FRAGMENT = 1;
const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
const HYDRATION_ERROR = {};

const UNINITIALIZED = Symbol('uninitialized');

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

/** @import { Snapshot } from './types' */

/**
 * In dev, we keep track of which properties could not be cloned. In prod
 * we don't bother, but we keep a dummy array around so that the
 * signature stays the same
 * @type {string[]}
 */
const empty = [];

/**
 * @template T
 * @param {T} value
 * @param {boolean} [skip_warning]
 * @param {boolean} [no_tojson]
 * @returns {Snapshot<T>}
 */
function snapshot(value, skip_warning = false, no_tojson = false) {

	return clone(value, new Map(), '', empty, null, no_tojson);
}

/**
 * @template T
 * @param {T} value
 * @param {Map<T, Snapshot<T>>} cloned
 * @param {string} path
 * @param {string[]} paths
 * @param {null | T} [original] The original value, if `value` was produced from a `toJSON` call
 * @param {boolean} [no_tojson]
 * @returns {Snapshot<T>}
 */
function clone(value, cloned, path, paths, original = null, no_tojson = false) {
	if (typeof value === 'object' && value !== null) {
		var unwrapped = cloned.get(value);
		if (unwrapped !== undefined) return unwrapped;

		if (value instanceof Map) return /** @type {Snapshot<T>} */ (new Map(value));
		if (value instanceof Set) return /** @type {Snapshot<T>} */ (new Set(value));

		if (is_array(value)) {
			var copy = /** @type {Snapshot<any>} */ (Array(value.length));
			cloned.set(value, copy);

			if (original !== null) {
				cloned.set(original, copy);
			}

			for (var i = 0; i < value.length; i += 1) {
				var element = value[i];
				if (i in value) {
					copy[i] = clone(element, cloned, path, paths, null, no_tojson);
				}
			}

			return copy;
		}

		if (get_prototype_of(value) === object_prototype) {
			/** @type {Snapshot<any>} */
			copy = {};
			cloned.set(value, copy);

			if (original !== null) {
				cloned.set(original, copy);
			}

			for (var key of Object.keys(value)) {
				copy[key] = clone(
					// @ts-expect-error
					value[key],
					cloned,
					path,
					paths,
					null,
					no_tojson
				);
			}

			return copy;
		}

		if (value instanceof Date) {
			// Ensure SvelteDate snapshots are tracked
			value.getTime();
			return /** @type {Snapshot<T>} */ (structuredClone(value));
		}

		if (typeof (/** @type {T & { toJSON?: any } } */ (value).toJSON) === 'function' && !no_tojson) {
			return clone(
				/** @type {T & { toJSON(): any } } */ (value).toJSON(),
				cloned,
				path,
				paths,
				// Associate the instance with the toJSON clone
				value
			);
		}
	}

	if (value instanceof EventTarget) {
		// can't be cloned
		return /** @type {Snapshot<T>} */ (value);
	}

	try {
		return /** @type {Snapshot<T>} */ (structuredClone(value));
	} catch (e) {

		return /** @type {Snapshot<T>} */ (value);
	}
}

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

/**
 * @param {HTMLSelectElement} select
 * @param {() => unknown} get
 * @param {(value: unknown) => void} set
 * @returns {void}
 */
function bind_select_value(select, get, set = get) {
	var batches = new WeakSet();
	var mounting = true;

	listen_to_event_and_reset_event(select, 'change', (is_reset) => {
		var query = is_reset ? '[selected]' : ':checked';
		/** @type {unknown} */
		var value;

		if (select.multiple) {
			value = [].map.call(select.querySelectorAll(query), get_option_value);
		} else {
			/** @type {HTMLOptionElement | null} */
			var selected_option =
				select.querySelector(query) ??
				// will fall back to first non-disabled option if no option is selected
				select.querySelector('option:not([disabled])');
			value = selected_option && get_option_value(selected_option);
		}

		set(value);

		// @ts-ignore
		select.__value = value;

		if (current_batch !== null) {
			batches.add(current_batch);
		}
	});

	// Needs to be an effect, not a render_effect, so that in case of each loops the logic runs after the each block has updated
	effect(() => {
		var value = get();

		if (select === document.activeElement) {
			// In sync mode render effects are executed during tree traversal -> needs current_batch
			// In async mode render effects are flushed once batch resolved, at which point current_batch is null -> needs previous_batch
			var batch = /** @type {Batch} */ (current_batch);

			// Don't update the <select> if it is focused. We can get here if, for example,
			// an update is deferred because of async work depending on the select:
			//
			// <select bind:value={selected}>...</select>
			// <p>{await find(selected)}</p>
			if (batches.has(batch)) {
				return;
			}
		}

		select_option(select, value, mounting);

		// Mounting and value undefined -> take selection from dom
		if (mounting && value === undefined) {
			/** @type {HTMLOptionElement | null} */
			var selected_option = select.querySelector(':checked');
			if (selected_option !== null) {
				value = get_option_value(selected_option);
				set(value);
			}
		}

		// @ts-ignore
		select.__value = value;
		mounting = false;
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

const base = {
  font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  radius: 10,
  density: "comfortable",
  animations: "on",
  wallpaperDim: 0.35,
  builtin: true
};
const PRESETS = [
  { ...base, id: "sternenhof", name: "Sternenhof", accent: "#ff6b35", mode: "dark" },
  { ...base, id: "aurora", name: "Aurora", accent: "#5b8def", mode: "dark" },
  { ...base, id: "nord", name: "Nord", accent: "#88c0d0", mode: "dark" },
  { ...base, id: "forest", name: "Wald", accent: "#4caf72", mode: "dark" },
  { ...base, id: "grape", name: "Traube", accent: "#9b6bff", mode: "dark" },
  { ...base, id: "rose", name: "Rosé", accent: "#ef5da8", mode: "light" },
  { ...base, id: "sand", name: "Sand", accent: "#c79a5b", mode: "light" }
];
function clonePresets() {
  return PRESETS.map((p) => ({ ...p }));
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
        const answer = getSpec(scheme.specVersion).getHct(scheme, this);
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
        return getSpec(scheme.specVersion).getTone(scheme, this);
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
const spec2021 = new ColorCalculationDelegateImpl2021();
const spec2025 = new ColorCalculationDelegateImpl2025();
/**
 * Returns the ColorCalculationDelegate for the given spec version.
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

function generatePalette(seedHex, mode) {
  let seed;
  try {
    seed = argbFromHex(seedHex);
  } catch {
    seed = argbFromHex("#ff6b35");
  }
  const src = Hct.fromInt(seed);
  const hue = src.hue;
  const chroma = src.chroma;
  const primary = TonalPalette.fromHueAndChroma(hue, Math.max(chroma, 48));
  const secondary = TonalPalette.fromHueAndChroma(hue, 16);
  const tertiary = TonalPalette.fromHueAndChroma((hue + 60) % 360, 24);
  const neutral = TonalPalette.fromHueAndChroma(hue, 4);
  const variant = TonalPalette.fromHueAndChroma(hue, 8);
  const hex = (p, t) => hexFromArgb(p.tone(t));
  if (mode === "dark") {
    return {
      primary: hex(primary, 72),
      secondary: hex(secondary, 70),
      tertiary: hex(tertiary, 72),
      surface: hex(neutral, 12),
      surfaceVariant: hex(variant, 22),
      outline: hex(variant, 40),
      onSurface: hex(neutral, 92)
    };
  }
  return {
    primary: hex(primary, 44),
    secondary: hex(secondary, 40),
    tertiary: hex(tertiary, 40),
    surface: hex(neutral, 98),
    surfaceVariant: hex(variant, 90),
    outline: hex(variant, 50),
    onSurface: hex(neutral, 12)
  };
}
function generateTokens(seedHex, mode) {
  let seed;
  try {
    seed = argbFromHex(seedHex);
  } catch {
    seed = argbFromHex("#ff6b35");
  }
  const src = Hct.fromInt(seed);
  const hue = src.hue;
  const chroma = src.chroma;
  const primary = TonalPalette.fromHueAndChroma(hue, Math.max(chroma, 48));
  const neutral = TonalPalette.fromHueAndChroma(hue, 4);
  const variant = TonalPalette.fromHueAndChroma(hue, 8);
  const hex = (p, tone) => hexFromArgb(p.tone(tone));
  if (mode === "dark") {
    const accentTone2 = 72;
    return {
      bg: hex(neutral, 8),
      "bg-elevated": hex(neutral, 12),
      "bg-hover": hex(variant, 20),
      "bg-active": hex(variant, 26),
      border: hex(variant, 24),
      text: hex(neutral, 92),
      "text-muted": hex(variant, 72),
      "text-faint": hex(variant, 52),
      accent: hex(primary, accentTone2),
      "accent-hover": hex(primary, accentTone2 + 8),
      "accent-text": hex(primary, 12 ),
      shadow: "0 8px 32px rgba(0, 0, 0, 0.45)"
    };
  }
  const accentTone = 44;
  return {
    bg: hex(neutral, 98),
    "bg-elevated": hex(neutral, 100),
    "bg-hover": hex(variant, 94),
    "bg-active": hex(variant, 88),
    border: hex(variant, 85),
    text: hex(neutral, 12),
    "text-muted": hex(variant, 40),
    "text-faint": hex(variant, 55),
    accent: hex(primary, accentTone),
    "accent-hover": hex(primary, accentTone - 7),
    "accent-text": hex(primary, 100),
    shadow: "0 8px 32px rgba(0, 0, 0, 0.12)"
  };
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

function applySet(app, set, resolved) {
  const tokens = generateTokens(set.accent, resolved);
  const r = set.radius;
  tokens["radius-sm"] = `${Math.max(2, Math.round(r * 0.6))}px`;
  tokens["radius-md"] = `${r}px`;
  tokens["radius-lg"] = `${Math.round(r * 1.6)}px`;
  tokens["font-ui"] = set.font;
  const d = set.density === "compact" ? 0.72 : 1;
  tokens["space-1"] = `${Math.round(4 * d)}px`;
  tokens["space-2"] = `${Math.round(8 * d)}px`;
  tokens["space-3"] = `${Math.round(12 * d)}px`;
  tokens["space-4"] = `${Math.round(16 * d)}px`;
  tokens["space-5"] = `${Math.round(24 * d)}px`;
  tokens["space-6"] = `${Math.round(32 * d)}px`;
  tokens["transition"] = set.animations === "off" ? "0ms" : set.animations === "reduced" ? "90ms ease" : "160ms cubic-bezier(0.4, 0, 0.2, 1)";
  app.theme.setTokens(tokens);
  app.theme.setMode(set.mode);
  app.theme.setPalette(generatePalette(set.accent, resolved));
  const wallpaper = (app.platform.isMobile ? set.wallpaperMobile : set.wallpaperDesktop) ?? set.wallpaperDesktop ?? set.wallpaperMobile ?? null;
  app.theme.setWallpaper({ url: wallpaper, dim: set.wallpaperDim });
  document.documentElement.dataset.anim = set.animations;
}

const PLUGIN_ID = "theme";
class ThemeManager {
  constructor(app) {
    this.app = app;
    const saved = app.config.get(PLUGIN_ID, "state");
    const initial = saved?.sets?.length ? saved : { sets: clonePresets(), activeSetId: "sternenhof" };
    this.state = new Store(initial);
  }
  state;
  unsubResolved;
  /** When set, takes precedence over the saved active set (live editing). */
  previewSet = null;
  start() {
    this.applyActive();
    this.unsubResolved = this.app.theme.resolved.subscribe(() => this.applyActive());
  }
  stop() {
    this.unsubResolved?.();
  }
  persist() {
    this.app.config.set(PLUGIN_ID, "state", this.state.get());
  }
  getActive() {
    const s = this.state.get();
    return s.sets.find((x) => x.id === s.activeSetId) ?? s.sets[0];
  }
  applyActive() {
    const active = this.previewSet ?? this.getActive();
    if (active) applySet(this.app, active, this.app.theme.resolvedMode());
  }
  selectSet(id) {
    this.previewSet = null;
    this.state.update((s) => ({ ...s, activeSetId: id }));
    this.persist();
    this.applyActive();
  }
  /** Live-apply an in-progress edit without persisting. */
  preview(set) {
    this.previewSet = set;
    applySet(this.app, set, this.app.theme.resolvedMode());
  }
  clearPreview() {
    this.previewSet = null;
  }
  upsertSet(set) {
    this.previewSet = null;
    this.state.update((s) => {
      const idx = s.sets.findIndex((x) => x.id === set.id);
      const sets = [...s.sets];
      if (idx >= 0) sets[idx] = set;
      else sets.push(set);
      return { ...s, sets, activeSetId: set.id };
    });
    this.persist();
    this.applyActive();
  }
  duplicateSet(id) {
    const src = this.state.get().sets.find((x) => x.id === id);
    if (!src) return void 0;
    const copy = {
      ...src,
      id: `set-${id}-${this.state.get().sets.length}`,
      name: `${src.name} (Kopie)`,
      builtin: false
    };
    this.upsertSet(copy);
    return copy;
  }
  deleteSet(id) {
    this.previewSet = null;
    this.state.update((s) => {
      const target = s.sets.find((x) => x.id === id);
      if (!target || target.builtin) return s;
      const sets = s.sets.filter((x) => x.id !== id);
      const activeSetId = s.activeSetId === id ? sets[0]?.id ?? null : s.activeSetId;
      return { ...s, sets, activeSetId };
    });
    this.persist();
    this.applyActive();
  }
  newSet() {
    const n = this.state.get().sets.length;
    return {
      id: `set-custom-${n}`,
      name: "Neues Set",
      accent: "#ff6b35",
      mode: "dark",
      font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      radius: 10,
      density: "comfortable",
      animations: "on",
      wallpaperDim: 0.35,
      builtin: false
    };
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

const FONTS = [
  { label: "System", value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { label: "Inter / Sans", value: "'Inter', system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'Cascadia Code', Menlo, monospace" },
  { label: "Rund (Comic-frei)", value: "'Nunito', 'Quicksand', system-ui, sans-serif" }
];

var root = from_html(`<button><span class="swatch svelte-i9gmfj"></span> <span class="set-name svelte-i9gmfj"> </span> <span class="set-meta svelte-i9gmfj"> </span></button>`);
var root_1 = from_html(`<button> </button>`);
var root_2 = from_html(`<option> </option>`);
var root_3 = from_html(`<button class="ghost svelte-i9gmfj"> </button> <button class="ghost danger svelte-i9gmfj">Entfernen</button>`, 1);
var root_4 = from_html(`<label for="dim" class="dim-lbl svelte-i9gmfj"> </label> <input id="dim" type="range" min="0" max="0.85" step="0.05" class="svelte-i9gmfj"/>`, 1);
var root_5 = from_html(`<button class="ghost danger svelte-i9gmfj">Löschen</button>`);
var root_6 = from_html(`<span class="hint svelte-i9gmfj">Nicht aktiv — speichern aktiviert dieses Set.</span>`);
var root_7 = from_html(`<div class="editor svelte-i9gmfj"><header class="svelte-i9gmfj"><h1 class="svelte-i9gmfj">Design</h1> <p class="svelte-i9gmfj">Ein Set bündelt Farbe, Hell/Dunkel, Wallpaper, Schrift, Dichte und Animationen. Änderungen siehst du sofort live.</p></header> <section class="sets"><div class="sets-head svelte-i9gmfj"><h2 class="svelte-i9gmfj">Sets</h2> <button class="ghost svelte-i9gmfj">+ Neu</button></div> <div class="set-grid svelte-i9gmfj"></div></section> <section class="form svelte-i9gmfj"><div class="field svelte-i9gmfj"><label for="name" class="svelte-i9gmfj">Name</label> <input id="name" type="text" class="svelte-i9gmfj"/></div> <div class="field svelte-i9gmfj"><label for="accent" class="svelte-i9gmfj">Akzentfarbe</label> <div class="accent-row svelte-i9gmfj"><input id="accent" type="color" class="svelte-i9gmfj"/> <input class="hex svelte-i9gmfj" type="text" spellcheck="false"/></div></div> <div class="field svelte-i9gmfj"><span class="lbl svelte-i9gmfj">Modus</span> <div class="segmented svelte-i9gmfj"></div></div> <div class="field svelte-i9gmfj"><label for="font" class="svelte-i9gmfj">Schrift</label> <select id="font" class="svelte-i9gmfj"></select></div> <div class="field svelte-i9gmfj"><label for="radius" class="svelte-i9gmfj"> </label> <input id="radius" type="range" min="0" max="24" class="svelte-i9gmfj"/></div> <div class="field svelte-i9gmfj"><span class="lbl svelte-i9gmfj">Dichte</span> <div class="segmented svelte-i9gmfj"></div></div> <div class="field svelte-i9gmfj"><span class="lbl svelte-i9gmfj">Animationen</span> <div class="segmented svelte-i9gmfj"></div></div> <div class="field svelte-i9gmfj"><span class="lbl svelte-i9gmfj">Wallpaper</span> <div class="wp-controls svelte-i9gmfj"><label class="file-btn svelte-i9gmfj"> <input type="file" accept="image/*" hidden=""/></label> <!></div> <!></div></section> <footer class="svelte-i9gmfj"><button class="primary svelte-i9gmfj"> </button> <button class="ghost svelte-i9gmfj">Duplizieren</button> <!> <!></footer></div>`);

const $$css = {
	hash: 'svelte-i9gmfj',
	code: '.editor.svelte-i9gmfj {max-width:760px;margin:0 auto;padding:var(--space-5) var(--space-4) var(--space-6);}header.svelte-i9gmfj h1:where(.svelte-i9gmfj) {margin:0 0 var(--space-2);color:var(--accent);}header.svelte-i9gmfj p:where(.svelte-i9gmfj) {margin:0 0 var(--space-5);color:var(--text-muted);line-height:1.5;}h2.svelte-i9gmfj {font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-faint);margin:0;}.sets-head.svelte-i9gmfj {display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);}.set-grid.svelte-i9gmfj {display:grid;grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));gap:var(--space-2);margin-bottom:var(--space-5);}.set-card.svelte-i9gmfj {display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);text-align:left;transition:border-color var(--transition), transform var(--transition);}.set-card.svelte-i9gmfj:hover {transform:translateY(-1px);}.set-card.selected.svelte-i9gmfj {border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);}.swatch.svelte-i9gmfj {width:100%;height:22px;border-radius:var(--radius-sm);background:var(--sw);}.set-name.svelte-i9gmfj {font-weight:600;font-size:0.9rem;}.set-meta.svelte-i9gmfj {font-size:0.72rem;color:var(--text-faint);}.form.svelte-i9gmfj {display:flex;flex-direction:column;gap:var(--space-4);}.field.svelte-i9gmfj {display:flex;flex-direction:column;gap:var(--space-2);}.field.svelte-i9gmfj label:where(.svelte-i9gmfj),\n  .field.svelte-i9gmfj .lbl:where(.svelte-i9gmfj) {font-size:0.9rem;color:var(--text-muted);}input[type=\'text\'].svelte-i9gmfj,\n  select.svelte-i9gmfj {padding:var(--space-3);background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.95rem;width:100%;}.accent-row.svelte-i9gmfj {display:flex;gap:var(--space-2);align-items:center;}input[type=\'color\'].svelte-i9gmfj {width:52px;height:40px;padding:0;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-elevated);}.hex.svelte-i9gmfj {flex:1;font-family:var(--font-mono);text-transform:uppercase;}input[type=\'range\'].svelte-i9gmfj {width:100%;accent-color:var(--accent);}.segmented.svelte-i9gmfj {display:flex;flex-wrap:wrap;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;width:fit-content;max-width:100%;}.segmented.svelte-i9gmfj button:where(.svelte-i9gmfj) {padding:var(--space-2) var(--space-4);background:transparent;border:none;color:var(--text-muted);font-size:0.85rem;}.segmented.svelte-i9gmfj button.active:where(.svelte-i9gmfj) {background:var(--accent);color:var(--accent-text);}.wp-controls.svelte-i9gmfj {display:flex;flex-wrap:wrap;gap:var(--space-2);}.file-btn.svelte-i9gmfj {padding:var(--space-2) var(--space-4);background:var(--bg-active);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.85rem;cursor:pointer;}.dim-lbl.svelte-i9gmfj {margin-top:var(--space-2);}footer.svelte-i9gmfj {display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2);margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--border);}button.primary.svelte-i9gmfj {padding:var(--space-3) var(--space-5);background:var(--accent);color:var(--accent-text);border:none;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;}button.primary.svelte-i9gmfj:disabled {opacity:0.45;}button.ghost.svelte-i9gmfj {padding:var(--space-3) var(--space-4);background:transparent;border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text);font-size:0.9rem;}button.ghost.svelte-i9gmfj:hover {background:var(--bg-hover);}button.danger.svelte-i9gmfj {color:#e5484d;border-color:#e5484d55;}.hint.svelte-i9gmfj {font-size:0.82rem;color:var(--text-faint);}'
};

function SetEditor($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css);

	const themeState = useStore($$props.manager.state);

	// Local editable draft, seeded from the active set.
	let draft = state(proxy(cloneActive()));

	let dirty = state(false);
	let extracting = state(false);

	function cloneActive() {
		const a = $$props.manager.getActive();

		return a
			? structuredClone(snapshot(a))
			: $$props.manager.newSet();
	}

	// Live preview whenever the draft changes.
	user_effect(() => {
		const snap = snapshot(get(draft));

		$$props.manager.preview(snap);
	});

	function loadSet(id) {
		$$props.manager.selectSet(id);
		set(draft, cloneActive(), true);
		set(dirty, false);
	}

	function markDirty() {
		set(dirty, true);
	}

	function save() {
		$$props.manager.upsertSet(snapshot(get(draft)));
		set(dirty, false);
	}

	function newSet() {
		set(draft, $$props.manager.newSet(), true);
		set(dirty, true);
	}

	function duplicate() {
		const copy = $$props.manager.duplicateSet(get(draft).id);

		if (copy) {
			set(draft, structuredClone(snapshot(copy)), true);
			set(dirty, false);
		}
	}

	function remove() {
		const id = get(draft).id;

		$$props.manager.deleteSet(id);
		set(draft, cloneActive(), true);
		set(dirty, false);
	}

	function onWallpaper(e) {
		const input = e.target;
		const file = input.files?.[0];

		if (!file) return;

		const reader = new FileReader();

		reader.onload = () => {
			const url = reader.result;

			get(draft).wallpaperDesktop = url;
			get(draft).wallpaperMobile = url;
			markDirty();
		};

		reader.readAsDataURL(file);
	}

	function clearWallpaper() {
		get(draft).wallpaperDesktop = undefined;
		get(draft).wallpaperMobile = undefined;
		markDirty();
	}

	async function paletteFromWallpaper() {
		const src = get(draft).wallpaperDesktop ?? get(draft).wallpaperMobile;

		if (!src) return;

		set(extracting, true);

		const seed = await seedFromImage(src);

		set(extracting, false);

		if (seed) {
			get(draft).accent = seed;
			markDirty();
		}
	}

	let isActive = user_derived(() => themeState.value.activeSetId === get(draft).id);
	let hasWallpaper = user_derived(() => !!(get(draft).wallpaperDesktop ?? get(draft).wallpaperMobile));
	var div = root_7();
	var section = sibling(child(div), 2);
	var div_1 = child(section);
	var button = sibling(child(div_1), 2);

	var div_2 = sibling(div_1, 2);

	each(div_2, 21, () => themeState.value.sets, (s) => s.id, ($$anchor, s) => {
		var button_1 = root();
		let classes;
		var span = sibling(child(button_1), 2);
		var text = only_child(span, true);
		var span_1 = sibling(span, 2);
		var text_1 = only_child(span_1);

		template_effect(() => {
			classes = set_class(button_1, 1, 'set-card svelte-i9gmfj', null, classes, { selected: get(s).id === get(draft).id });
			set_style(button_1, `--sw:${get(s).accent ?? ''}`);
			set_text(text, get(s).name);
			set_text(text_1, `${get(s).mode ?? ''}${get(s).builtin ? ' · fix' : ''}`);
		});

		delegated('click', button_1, () => loadSet(get(s).id));
		append($$anchor, button_1);
	});

	var section_1 = sibling(section, 2);
	var div_3 = child(section_1);
	var input_1 = sibling(child(div_3), 2);

	var div_4 = sibling(div_3, 2);
	var div_5 = sibling(child(div_4), 2);
	var input_2 = child(div_5);

	var input_3 = sibling(input_2, 2);

	var div_6 = sibling(div_4, 2);
	var div_7 = sibling(child(div_6), 2);

	each(div_7, 20, () => ['auto', 'light', 'dark'], index, ($$anchor, m) => {
		var button_2 = root_1();
		let classes_1;
		var text_2 = only_child(button_2, true);

		template_effect(() => {
			classes_1 = set_class(button_2, 1, 'svelte-i9gmfj', null, classes_1, { active: get(draft).mode === m });
			set_text(text_2, m === 'auto' ? 'Auto' : m === 'light' ? 'Hell' : 'Dunkel');
		});

		delegated('click', button_2, () => {
			get(draft).mode = m;
			markDirty();
		});

		append($$anchor, button_2);
	});

	var div_8 = sibling(div_6, 2);
	var select = sibling(child(div_8), 2);

	each(select, 21, () => FONTS, index, ($$anchor, f) => {
		var option = root_2();
		var text_3 = only_child(option, true);
		var option_value = {};

		template_effect(() => {
			set_text(text_3, get(f).label);

			if (option_value !== (option_value = get(f).value)) {
				option.value = (option.__value = option_value) ?? '';
			}
		});

		append($$anchor, option);
	});
	init_select(select);

	var div_9 = sibling(div_8, 2);
	var label = child(div_9);
	var text_4 = only_child(label);
	var input_4 = sibling(label, 2);

	var div_10 = sibling(div_9, 2);
	var div_11 = sibling(child(div_10), 2);

	each(div_11, 20, () => [['comfortable', 'Komfortabel'], ['compact', 'Kompakt']], index, ($$anchor, $$item) => {
		var $$array = user_derived(() => to_array($$item, 2));
		let v = () => get($$array)[0];
		let l = () => get($$array)[1];
		var button_3 = root_1();
		let classes_2;
		var text_5 = only_child(button_3, true);

		template_effect(() => {
			classes_2 = set_class(button_3, 1, 'svelte-i9gmfj', null, classes_2, { active: get(draft).density === v() });
			set_text(text_5, l());
		});

		delegated('click', button_3, () => {
			get(draft).density = v();
			markDirty();
		});

		append($$anchor, button_3);
	});

	var div_12 = sibling(div_10, 2);
	var div_13 = sibling(child(div_12), 2);

	each(div_13, 20, () => [['on', 'An'], ['reduced', 'Reduziert'], ['off', 'Aus']], index, ($$anchor, $$item) => {
		var $$array_1 = user_derived(() => to_array($$item, 2));
		let v = () => get($$array_1)[0];
		let l = () => get($$array_1)[1];
		var button_4 = root_1();
		let classes_3;
		var text_6 = only_child(button_4, true);

		template_effect(() => {
			classes_3 = set_class(button_4, 1, 'svelte-i9gmfj', null, classes_3, { active: get(draft).animations === v() });
			set_text(text_6, l());
		});

		delegated('click', button_4, () => {
			get(draft).animations = v();
			markDirty();
		});

		append($$anchor, button_4);
	});

	var div_14 = sibling(div_12, 2);
	var div_15 = sibling(child(div_14), 2);
	var label_1 = child(div_15);
	var text_7 = child(label_1);
	var input_5 = sibling(text_7);

	var node = sibling(label_1, 2);

	{
		var consequent = ($$anchor) => {
			var fragment = root_3();
			var button_5 = first_child(fragment);
			var text_8 = only_child(button_5, true);
			var button_6 = sibling(button_5, 2);

			template_effect(() => {
				button_5.disabled = get(extracting);
				set_text(text_8, get(extracting) ? 'Lese Farben…' : 'Palette aus Wallpaper');
			});

			delegated('click', button_5, paletteFromWallpaper);
			delegated('click', button_6, clearWallpaper);
			append($$anchor, fragment);
		};

		if_block(node, ($$render) => {
			if (get(hasWallpaper)) $$render(consequent);
		});
	}

	var node_1 = sibling(div_15, 2);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_1 = root_4();
			var label_2 = first_child(fragment_1);
			var text_9 = only_child(label_2);
			var input_6 = sibling(label_2, 2);
			template_effect(($0) => set_text(text_9, `Abdunkeln · ${$0 ?? ''}%`), [() => Math.round(get(draft).wallpaperDim * 100)]);
			delegated('input', input_6, markDirty);
			bind_value(input_6, () => get(draft).wallpaperDim, ($$value) => get(draft).wallpaperDim = $$value);
			append($$anchor, fragment_1);
		};

		if_block(node_1, ($$render) => {
			if (get(hasWallpaper)) $$render(consequent_1);
		});
	}

	var footer = sibling(section_1, 2);
	var button_7 = child(footer);
	var text_10 = only_child(button_7, true);
	var button_8 = sibling(button_7, 2);
	var node_2 = sibling(button_8, 2);

	{
		var consequent_2 = ($$anchor) => {
			var button_9 = root_5();

			delegated('click', button_9, remove);
			append($$anchor, button_9);
		};

		var d = user_derived(() => !get(draft).builtin && themeState.value.sets.some((s) => s.id === get(draft).id));

		if_block(node_2, ($$render) => {
			if (get(d)) $$render(consequent_2);
		});
	}

	var node_3 = sibling(node_2, 2);

	{
		var consequent_3 = ($$anchor) => {
			var span_2 = root_6();

			append($$anchor, span_2);
		};

		if_block(node_3, ($$render) => {
			if (!get(isActive)) $$render(consequent_3);
		});
	}

	template_effect(
		($0) => {
			set_text(text_4, `Ecken-Rundung · ${get(draft).radius ?? ''}px`);
			set_text(text_7, `${get(hasWallpaper) ? 'Ändern' : 'Hochladen'} `);
			button_7.disabled = !get(dirty);
			set_text(text_10, $0);
		},
		[
			() => get(draft).id && themeState.value.sets.some((s) => s.id === get(draft).id) ? 'Speichern' : 'Erstellen'
		]
	);

	delegated('click', button, newSet);
	delegated('input', input_1, markDirty);
	bind_value(input_1, () => get(draft).name, ($$value) => get(draft).name = $$value);
	delegated('input', input_2, markDirty);
	bind_value(input_2, () => get(draft).accent, ($$value) => get(draft).accent = $$value);
	delegated('input', input_3, markDirty);
	bind_value(input_3, () => get(draft).accent, ($$value) => get(draft).accent = $$value);
	delegated('change', select, markDirty);
	bind_select_value(select, () => get(draft).font, ($$value) => get(draft).font = $$value);
	delegated('input', input_4, markDirty);
	bind_value(input_4, () => get(draft).radius, ($$value) => get(draft).radius = $$value);
	delegated('change', input_5, onWallpaper);
	delegated('click', button_7, save);
	delegated('click', button_8, duplicate);
	append($$anchor, div);
	pop();
}

delegate(['click', 'input', 'change']);

const manifest = {
  id: "theme",
  name: "Design",
  version: "0.1.0",
  description: "Theme-Sets: Farbe, Hell/Dunkel, Wallpaper, Schrift, Dichte, Animationen. Palette aus einer Farbe oder einem Wallpaper (Material You).",
  author: "Sojus",
  main: "index.ts",
  type: "theme"
};
class DesignView extends View {
  constructor(app, manager) {
    super(app);
    this.manager = manager;
  }
  component = null;
  getViewType() {
    return "theme-design";
  }
  getDisplayName() {
    return "Design";
  }
  getIcon() {
    return "palette";
  }
  async onOpen() {
    this.component = mount(SetEditor, {
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
class ThemePlugin extends Plugin {
  manager;
  constructor(app, m) {
    super(app, m);
  }
  async onload() {
    this.manager = new ThemeManager(this.app);
    this.manager.start();
    this.registerView("theme-design", () => new DesignView(this.app, this.manager));
    this.addNavigationItem({
      id: "theme-design",
      name: "Design",
      icon: "palette",
      priority: 10
    });
    this.addCommand({
      id: "open",
      name: "Design öffnen",
      callback: () => this.app.workspace.openView("theme-design")
    });
    this.addCommand({
      id: "toggle-mode",
      name: "Design: Hell/Dunkel umschalten",
      callback: () => {
        const next = this.app.theme.resolvedMode() === "dark" ? "light" : "dark";
        this.app.theme.setMode(next);
        this.manager.applyActive();
      }
    });
  }
  async onunload() {
    this.manager.stop();
  }
}

export { ThemePlugin as default, manifest };
