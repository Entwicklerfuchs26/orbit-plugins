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

/** @param {Function} fn */
function run(fn) {
	return fn();
}

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
	if (n === undefined || !(Symbol.iterator in value)) {
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
const PROPS_IS_RUNES = 1 << 1;
const PROPS_IS_UPDATED = 1 << 2;
const PROPS_IS_BINDABLE = 1 << 3;
const PROPS_IS_LAZY_INITIAL = 1 << 4;

const TEMPLATE_FRAGMENT = 1;
const TEMPLATE_USE_IMPORT_NODE = 1 << 1;
const HYDRATION_ERROR = {};

const UNINITIALIZED = Symbol('uninitialized');

const NAMESPACE_HTML = 'http://www.w3.org/1999/xhtml';
const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';
const NAMESPACE_MATHML = 'http://www.w3.org/1998/Math/MathML';

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
/** True if we're not certain that we only have Svelte 5 code in the compilation */
let legacy_mode_flag = false;
/** True if $inspect.trace is used */
let tracing_mode_flag = false;

function enable_legacy_mode_flag() {
	legacy_mode_flag = true;
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
		l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null
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
	return !legacy_mode_flag || (component_context !== null && component_context.l === null);
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
 * @param {Map<Effect, number>} dirty_reactions
 */
function defer_effect(effect, dirty_reactions) {
	if ((effect.f & DIRTY) !== 0) {
		dirty_reactions.set(effect, DIRTY);
	} else if ((effect.f & MAYBE_DIRTY) !== 0 && dirty_reactions.get(effect) !== DIRTY) {
		dirty_reactions.set(effect, MAYBE_DIRTY);
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
	const d = is_runes() ? derived : derived_safe_equal;

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
	started = false;

	linked = true;

	/** @type {Batch | null} */
	prev = null;

	/** @type {Batch | null} */
	next = null;

	/** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
	async_deriveds = new Map();

	/**
	 * The current values of any signals that are updated in this batch.
	 * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
	 * The keys of this map are identical to `this.previous`
	 * @type {Map<Value, [any, boolean]>}
	 */
	current = new Map();

	/**
	 * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
	 * The keys of this map are identical to `this.current`
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
	 * Deferred effects (which run after async work has completed) and their status (DIRTY or MAYBE_DIRTY)
	 * @type {Map<Effect, number>}
	 */
	#dirty_reactions = new Map();

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
		if (last_batch === null) {
			first_batch = last_batch = this;
		} else {
			last_batch.next = this;
			this.prev = last_batch;
		}

		last_batch = this;
	}

	#is_deferred() {
		if (this.is_fork) return true;

		for (const effect of this.#blocking_pending.keys()) {
			// pending work inside a skipped branch doesn't block, the branch is going to be destroyed
			if (!this.#is_skipped(effect)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether `effect` is inside a branch that this batch skips
	 * @param {Effect} effect
	 */
	#is_skipped(effect) {
		for (var e = /** @type {Effect | null} */ (effect); e !== null; e = e.parent) {
			if (this.#skipped_branches.has(e)) return true;
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
		this.started = true;

		// We always reschedule previously-deferred effects, not just when
		// #is_deferred() is true, because traversing the tree could make
		// an if block that contains the last blocking pending effect falsy,
		// causing the block to no longer be deferred.
		for (const [e, status] of this.#dirty_reactions) {
			set_signal_status(e, status);
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
		this.#dirty_reactions.clear();

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
					if ((flags & BLOCK_EFFECT) !== 0) this.add_dirty_reaction(effect, MAYBE_DIRTY);
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
		for (var batch = this.prev; batch !== null; batch = batch.prev) {
			if (!batch.is_fork && this.#intersects(batch)) return batch;
		}

		return null;
	}

	/** @param {Batch} batch */
	#intersects(batch) {
		for (const [source, [, is_derived]] of this.current) {
			if (is_derived) continue;
			if (batch.current.has(source)) return true;
		}

		return false;
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
		this.transfer_reactions(batch.#dirty_reactions);

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
						this.#dirty_reactions.delete(effect);
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
			defer_effect(effects[i], this.#dirty_reactions);
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
		for (let batch = first_batch; batch !== null; batch = batch.next) {
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
			if (!batch.started || current.length === 0) continue;

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
								batch.add_dirty_reaction(effect, DIRTY);
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
	 * @param {Map<Effect, number>} dirty_reactions
	 */
	transfer_reactions(dirty_reactions) {
		for (const [effect, status] of dirty_reactions) {
			this.add_dirty_reaction(effect, status);
		}

		dirty_reactions.clear();
	}

	/**
	 * @param {Effect} effect
	 * @param {number} status
	 */
	add_dirty_reaction(effect, status) {
		if (status === DIRTY || this.#dirty_reactions.get(effect) !== DIRTY) {
			this.#dirty_reactions.set(effect, status);
		}
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
					if (!batch.started) {
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

		var prev = this.prev;
		var next = this.next;

		if (prev === null) {
			first_batch = next;
		} else {
			prev.next = next;
		}

		if (next === null) {
			last_batch = prev;
		} else {
			next.prev = prev;
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
	/** @type {Source<V>} */
	var signal = {
		f: 0,
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

	// bind the signal to the component context, in case we need to
	// track updates to trigger beforeUpdate/afterUpdate callbacks
	if (legacy_mode_flag && trackable && component_context !== null && component_context.l !== null) {
		(component_context.l.s ??= []).push(s);
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
			is_runes() &&
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

	var runes = is_runes();
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

		// In legacy mode, skip the current effect to prevent infinite loops
		if (!runes && reaction === active_effect) continue;

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
				((active_effect !== null || active_reaction !== null) &&
					(!has || get_descriptor(target, prop)?.writable))
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
	if (namespace == null || namespace === NAMESPACE_HTML) {
		return /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */ (
			is ? document.createElement(tag, { is }) : document.createElement(tag)
		);
	}
	return /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */ (
		is ? document.createElementNS(namespace, tag, { is }) : document.createElementNS(namespace, tag)
	);
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
 * Internal representation of `$effect.pre(...)`
 * @param {() => void | (() => void)} fn
 * @returns {Effect}
 */
function user_pre_effect(fn) {
	validate_effect();
	return create_effect(RENDER_EFFECT | USER_EFFECT, fn);
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

	/** @type {Map<Effect, number>} */
	#dirty_reactions = new Map();

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
		batch.transfer_reactions(this.#dirty_reactions);
	}

	/**
	 * Defer an effect inside a pending boundary until the boundary resolves
	 * @param {Effect} effect
	 */
	defer_effect(effect) {
		defer_effect(effect, this.#dirty_reactions);
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

	var legacy = !is_runes();

	block(() => {
		var key = get_key();

		// NaN !== NaN, hence we do this workaround to not trigger remounts unnecessarily
		if (key !== key) {
			key = /** @type {any} */ (NAN);
		}

		// key blocks in Svelte <5 had stupid semantics
		if (legacy && key !== null && typeof key === 'object') {
			key = /** @type {V} */ ({});
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

/** @import { Effect, TemplateNode } from '#client' */
/** @import {} from 'trusted-types' */

/**
 * @param {Element | Text | Comment} node
 * @param {() => string | TrustedHTML} get_value
 * @param {boolean} [is_controlled]
 * @param {boolean} [svg]
 * @param {boolean} [mathml]
 * @param {boolean} [skip_warning]
 * @returns {void}
 */
function html(
	node,
	get_value,
	is_controlled = false,
	svg = false,
	mathml = false,
	skip_warning = false
) {
	var anchor = node;

	/** @type {string | TrustedHTML} */
	var value = '';

	if (is_controlled) {
		var parent_node = /** @type {Element} */ (node);
	}

	template_effect(() => {
		var effect = /** @type {Effect} */ (active_effect);

		if (value === (value = get_value() ?? '')) {
			return;
		}

		if (is_controlled && true) {
			// When @html is the only child, use innerHTML directly.
			// This also handles contenteditable, where the user may delete the anchor comment.
			effect.nodes = null;
			parent_node.innerHTML = /** @type {string} */ (value);

			if (value !== '') {
				assign_nodes(
					/** @type {TemplateNode} */ (get_first_child(parent_node)),
					/** @type {TemplateNode} */ (parent_node.lastChild)
				);
			}

			return;
		}

		if (effect.nodes !== null) {
			remove_effect_dom(effect.nodes.start, /** @type {TemplateNode} */ (effect.nodes.end));
			effect.nodes = null;
		}

		if (value === '') return;

		// Don't use create_fragment_with_script_from_html here because that would mean script tags are executed.
		// @html is basically `.innerHTML = ...` and that doesn't execute scripts either due to security reasons.
		// Use a <template>, <svg>, or <math> wrapper depending on context. If value is a TrustedHTML object,
		// it will be assigned directly to innerHTML without coercion — this allows {@html policy.createHTML(...)} to work.
		var ns = svg ? NAMESPACE_SVG : mathml ? NAMESPACE_MATHML : undefined;
		var wrapper = /** @type {HTMLTemplateElement | SVGElement | MathMLElement} */ (
			create_element(svg ? 'svg' : mathml ? 'math' : 'template', ns)
		);
		wrapper.innerHTML = /** @type {any} */ (value);

		/** @type {DocumentFragment | Element} */
		var node = svg || mathml ? wrapper : /** @type {HTMLTemplateElement} */ (wrapper).content;

		assign_nodes(
			/** @type {TemplateNode} */ (get_first_child(node)),
			/** @type {TemplateNode} */ (node.lastChild)
		);

		if (svg || mathml) {
			while (get_first_child(node)) {
				anchor.before(/** @type {TemplateNode} */ (get_first_child(node)));
			}
		} else {
			anchor.before(node);
		}
	});
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
 * @param {boolean} checked
 */
function set_checked(element, checked) {
	var attributes = get_attributes(element);

	if (
		attributes.checked ===
		(attributes.checked =
			// treat null and undefined the same for the initial value
			checked ?? undefined)
	) {
		return;
	}

	// @ts-expect-error
	element.checked = checked;
}

/**
 * @param {Element} element
 * @param {string} attribute
 * @param {string | null} value
 * @param {boolean} [skip_warning]
 */
function set_attribute(element, attribute, value, skip_warning) {
	var attributes = get_attributes(element);

	var previous = attributes[attribute];
	if (previous === (attributes[attribute] = value)) return;

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

/** @import { ComponentContextLegacy } from '#client' */

/**
 * Legacy-mode only: Call `onMount` callbacks and set up `beforeUpdate`/`afterUpdate` effects
 * @param {boolean} [immutable]
 */
function init(immutable = false) {
	const context = /** @type {ComponentContextLegacy} */ (component_context);

	const callbacks = context.l.u;
	if (!callbacks) return;

	let props = () => deep_read_state(context.s);

	if (immutable) {
		let version = 0;
		let prev = /** @type {Record<string, any>} */ ({});

		// In legacy immutable mode, before/afterUpdate only fire if the object identity of a prop changes
		const d = derived(() => {
			let changed = false;
			const props = context.s;
			for (const key in props) {
				if (props[key] !== prev[key]) {
					prev[key] = props[key];
					changed = true;
				}
			}
			if (changed) version++;
			return version;
		});

		props = () => get(d);
	}

	// beforeUpdate
	if (callbacks.b.length) {
		user_pre_effect(() => {
			observe_all(context, props);
			run_all(callbacks.b);
		});
	}

	// onMount (must run before afterUpdate)
	user_effect(() => {
		const fns = untrack(() => callbacks.m.map(run));
		return () => {
			for (const fn of fns) {
				if (typeof fn === 'function') {
					fn();
				}
			}
		};
	});

	// afterUpdate
	if (callbacks.a.length) {
		user_effect(() => {
			observe_all(context, props);
			run_all(callbacks.a);
		});
	}
}

/**
 * Invoke the getter of all signals associated with a component
 * so they can be registered to the effect this function is called in.
 * @param {ComponentContextLegacy} context
 * @param {(() => void)} props
 */
function observe_all(context, props) {
	if (context.l.s) {
		for (const signal of context.l.s) get(signal);
	}

	props();
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
	var runes = !legacy_mode_flag || (flags & PROPS_IS_RUNES) !== 0;
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
			if (runes) props_invalid_value();
			setter(initial_value);
		}
	}

	/** @type {() => V} */
	var getter;

	if (runes) {
		getter = () => {
			var value = /** @type {V} */ (props[key]);
			if (value === undefined) return get_fallback();
			fallback_dirty = true;
			return value;
		};
	} else {
		getter = () => {
			var value = /** @type {V} */ (props[key]);

			if (value !== undefined) {
				// in legacy mode, we don't revert to the fallback value
				// if the prop goes from defined to undefined. The easiest
				// way to model this is to make the fallback undefined
				// as soon as the prop has a value
				fallback_value = /** @type {V} */ (undefined);
			}

			return value === undefined ? fallback_value : value;
		};
	}

	// prop is never written to — we only need a getter
	if (runes && (flags & PROPS_IS_UPDATED) === 0) {
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
					if (!runes || !mutation || legacy_parent || is_store_sub) {
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
				const new_value = mutation ? get(d) : runes && bindable ? proxy(value) : value;

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

const O = globalThis.Orbit;
const Plugin = O.Plugin;
const View = O.View;

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

// generated during release, do not modify

const PUBLIC_VERSION = '5';

if (typeof window !== 'undefined') {
	// @ts-expect-error
	((window.__svelte ??= {}).v ??= new Set()).add(PUBLIC_VERSION);
}

enable_legacy_mode_flag();

/* conn.svelte.ts generated by Svelte v5.57.3 */

let LS = "orbitlist.conn";

const conn = proxy({
	mode: "same",
	server: "",
	key: "",
	defaultServer: "",
	needsSetup: false,
	message: "",
	everOk: false,
	rev: 0
});

let transport = (url, init) => fetch(url, init);

function configure(o) {
	if (o.storageKey) LS = o.storageKey;
	if (o.http) transport = o.http;
	conn.mode = "plugin";
	if (o.defaultServer) conn.defaultServer = o.defaultServer;

	try {
		const s = JSON.parse(localStorage.getItem(LS) || "{}");

		conn.server = s.server || "";
		conn.key = s.key || "";
	} catch {}

	if (conn.mode === "plugin" && !conn.server) conn.needsSetup = true;
}

function save() {
	try {
		localStorage.setItem(LS, JSON.stringify({ server: conn.server, key: conn.key }));
	} catch {}
}

function base() {
	if (conn.mode === "plugin") return conn.server;

	return "";
}

function normalizeServer(input) {
	let s = input.trim().replace(/\/+$/, "");

	if (!s) return "";
	if (!(/^https?:\/\//i).test(s)) s = "http://" + s;

	const hostport = s.replace(/^https?:\/\//i, "").split("/")[0];

	if (!(/:\d+$/).test(hostport) && !(/^https:/i).test(s)) s = s.replace(hostport, hostport + ":8787");

	return s;
}

async function raw(server, path, key, init = {}) {
	const headers = { ...init.headers || {} };

	if (key) headers["X-Orbitlist-Key"] = key;

	return transport(server + path, { ...init, headers });
}

async function request(path, init = {}) {
	let r;

	try {
		r = await raw(base(), path, conn.key, init);
	} catch(e) {
		if (conn.mode === "plugin" && !conn.everOk) {
			conn.needsSetup = true;
			conn.message = "Server nicht erreichbar — Adresse und Netz prüfen.";
		}

		throw e;
	}

	if (r.status === 401 || r.status === 403 && !conn.key) {
		conn.needsSetup = true;

		conn.message = r.status === 401
			? "Bitte Passwort eingeben."
			: "Das Backend hat noch kein Passwort — am Server `python -m app.auth` ausführen.";
	} else {
		conn.everOk = true;
	}

	return r;
}

async function tryConnect(serverInput, password) {
	const server = conn.mode === "plugin" ? normalizeServer(serverInput) : "";

	if (conn.mode === "plugin" && !server) throw new Error("Bitte die Adresse des Backends eingeben (z. B. 192.168.1.20:8787).");

	let st;

	try {
		st = await (await raw(server, "/auth/status", "")).json();
	} catch {
		throw new Error("Backend nicht erreichbar. Adresse, Port und Netzwerk prüfen (läuft das Backend? gleiches Netz/VPN?).");
	}

	let key = "";

	if (st.required) {
		if (!password) throw new Error("Das Backend ist passwortgeschützt — bitte Passwort eingeben.");

		const r = await raw(server, "/auth/login", "", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ password })
		});

		if (r.status === 429) throw new Error((await r.json()).detail || "Zu viele Versuche.");
		if (r.status !== 200) throw new Error("Passwort falsch.");

		key = (await r.json()).key;
	}

	const chk = await raw(server, "/stats", key);

	if (chk.status === 403) throw new Error((await chk.json().catch(() => ({}))).detail || "Zugriff gesperrt.");
	if (chk.status !== 200) throw new Error(`Backend antwortet mit Status ${chk.status}.`);

	conn.server = server;
	conn.key = key;
	conn.needsSetup = false;
	conn.message = "";
	conn.everOk = true;
	save();
	conn.rev++;
}

function disconnect() {
	conn.key = "";

	if (conn.mode === "plugin") conn.server = "";

	save();
	conn.everOk = false;
	conn.needsSetup = true;
	conn.message = "";
}

function qs(q) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== null && v !== void 0 && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? "?" + s : "";
}
async function j(path, opts = {}) {
  const r = await request(path, opts);
  if (r.status < 200 || r.status >= 300) throw Object.assign(new Error(`${path} → ${r.status}`), { status: r.status });
  return r.json();
}
function jsonBody(body) {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
async function downloadExport(kind) {
  const r = await request("/export/" + kind);
  if (r.status !== 200) throw new Error(`Export fehlgeschlagen (${r.status})`);
  const text = await r.text();
  const blob = new Blob([text], { type: kind === "json" ? "application/json" : "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = kind === "json" ? "orbitlist-backup.json" : "orbitlist-mal.xml";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
}
const api = {
  health: () => j("/health"),
  stats: () => j("/stats"),
  anime: (q = {}) => j("/anime" + qs(q)),
  get: (id) => j("/anime/" + id),
  patchEntry: (id, patch) => j(`/media/${id}/entry`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }),
  reorderFavorites: (ids) => j("/favorites/reorder", jsonBody({ ids })),
  services: (config = "anime") => j("/services" + qs({ config })),
  addService: (body) => j("/services", jsonBody(body)),
  deleteService: (id) => j("/services/" + id, { method: "DELETE" }),
  aiSearch: (opts, token) => j("/ai/search" + qs(opts), token ? { headers: { "x-h-password": token } } : {}),
  profileStats: () => j("/profile/stats"),
  statsGenres: () => j("/stats/genres"),
  statsTags: () => j("/stats/tags"),
  statsDistributions: () => j("/stats/distributions"),
  // Filter-Metadaten pro Config (eigene Genres/Formate je Config; H braucht Token)
  metaFilters: (opts = {}, token) => j("/meta/filters" + qs(opts), token ? { headers: { "x-h-password": token } } : {}),
  availability: (id) => j(`/media/${id}/availability`),
  // Medientyp-Configs (Dropdown-Umschalter). token nötig, damit versteckte (H) mitkommen.
  mediaTypes: (token) => j("/media-types", token ? { headers: { "x-h-password": token } } : {}),
  addMediaType: (body) => j("/media-types", jsonBody(body)),
  deleteMediaType: (slug) => j("/media-types/" + encodeURIComponent(slug), { method: "DELETE" }),
  activeMediaType: () => j("/media-types/active"),
  setActiveMediaType: (slug) => j("/media-types/active", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) }),
  // H-Gate
  hStatus: () => j("/h/status"),
  hSetPassword: (password) => j("/h/password", jsonBody({ password })),
  hUnlock: (password) => j("/h/unlock", jsonBody({ password })),
  aiConfig: () => j("/ai/config"),
  aiConfigSet: (body) => j("/ai/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  aiTest: () => j("/ai/test", { method: "POST" }),
  aiStatus: () => j("/ai/status"),
  aiIndex: (rebuild = false) => j("/ai/index" + (rebuild ? "?rebuild=true" : ""), { method: "POST" }),
  anilistImport: (username) => j("/sync/anilist/import", jsonBody({ username })),
  anilistUsername: () => j("/sync/anilist/username"),
  statsStudios: () => j("/stats/studios"),
  syncPreview: () => j("/sync/anilist/preview"),
  syncRun: () => j("/sync/anilist/run", { method: "POST" }),
  pairInfo: () => j("/pair/info"),
  hReset: () => j("/h/reset", { method: "POST" }),
  h: (token, q = {}) => j("/h" + qs(q), { headers: { "x-h-password": token } })
};

var root$a = from_html(`<img alt="" loading="lazy" class="svelte-2gevwt"/>`);
var root_1$a = from_html(`<div class="ph svelte-2gevwt"> </div>`);
var root_2$a = from_html(`<span class="badge dub svelte-2gevwt" title="Deutscher Dub vorhanden">DE</span>`);
var root_3$9 = from_html(`<span class="badge rat svelte-2gevwt" title="Deine Wertung"> </span>`);
var root_4$9 = from_html(`<span class="badge own svelte-2gevwt" title="Im Regal">▣</span>`);
var root_5$8 = from_html(`<span class="badge score svelte-2gevwt" title="Durchschnitts-Wertung"> </span>`);
var root_6$8 = from_html(`<span> </span>`);
var root_7$7 = from_html(`<span class="score-txt svelte-2gevwt"> </span>`);
var root_8$7 = from_html(`<div class="genres svelte-2gevwt"> </div>`);
var root_9$7 = from_html(`<button><div class="cover svelte-2gevwt"><!> <!> <!> <!> <!></div> <div class="meta svelte-2gevwt"><div class="title svelte-2gevwt"> </div> <div class="sub svelte-2gevwt"><!> <!> <!></div> <!></div></button>`);

const $$css$a = {
	hash: 'svelte-2gevwt',
	code: '.card.svelte-2gevwt {display:flex;flex-direction:column;gap:8px;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer;}.cover.svelte-2gevwt {position:relative;aspect-ratio:185 / 265;   /* AniList-Cover ~0.70 */border-radius:var(--radius);overflow:hidden;background:var(--surface); /* Platzhalter-Fläche */box-shadow:var(--shadow-sm);transition:transform 0.18s ease, box-shadow 0.18s ease;}.card.svelte-2gevwt:hover .cover:where(.svelte-2gevwt) {transform:translateY(-2px);box-shadow:var(--shadow);}.cover.svelte-2gevwt img:where(.svelte-2gevwt) {width:100%;height:100%;object-fit:cover;display:block;transition:filter 0.18s ease;}.card.svelte-2gevwt:hover .cover:where(.svelte-2gevwt) img:where(.svelte-2gevwt) {filter:brightness(1.06);}.ph.svelte-2gevwt {width:100%;height:100%;display:grid;place-items:center;font-size:2rem;font-weight:600;color:var(--text-muted);}.badge.svelte-2gevwt {position:absolute;font-size:0.72rem;font-weight:700;line-height:1;padding:3px 6px;border-radius:var(--radius-sm);backdrop-filter:blur(4px);}.dub.svelte-2gevwt {top:6px;left:6px;background:var(--accent);color:var(--on-accent);}.rat.svelte-2gevwt {top:6px;right:6px;background:rgba(0, 0, 0, 0.6);color:var(--gold);}.own.svelte-2gevwt {top:6px;left:6px;background:var(--good);color:#04240f;}\n  /* Score grün unten links, wie AniLists Wertungs-Badge */.score.svelte-2gevwt {bottom:6px;left:6px;background:rgba(0, 0, 0, 0.6);color:var(--good);font-weight:600;}\n  /* own + dub liegen beide links oben → dub nach rechts rutschen, falls beides */.card.svelte-2gevwt:has(.own:where(.svelte-2gevwt)) .dub:where(.svelte-2gevwt) {left:auto;right:6px;}.title.svelte-2gevwt {font-size:0.85rem;font-weight:500;line-height:1.3;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color 0.15s ease;}.card.svelte-2gevwt:hover .title:where(.svelte-2gevwt) {color:var(--accent);}.sub.svelte-2gevwt {display:flex;gap:8px;margin-top:1px;font-size:0.72rem;color:var(--text-muted);}.score-txt.svelte-2gevwt {color:var(--good);}.genres.svelte-2gevwt {font-size:0.72rem;color:var(--text-muted);margin-top:2px;}\n\n  /* Listen-Ansicht: kompakte Zeile wie AniLists Listenzeile */.card.list.svelte-2gevwt {flex-direction:row;align-items:center;gap:12px;padding:6px 8px;border-radius:var(--radius);transition:background 0.15s ease;}.card.list.svelte-2gevwt:hover {background:var(--surface-2);}.card.list.svelte-2gevwt .cover:where(.svelte-2gevwt) {width:48px;aspect-ratio:185 / 265;flex:0 0 auto;border-radius:var(--radius-sm);box-shadow:none;}.card.list.svelte-2gevwt:hover .cover:where(.svelte-2gevwt) {transform:none;box-shadow:none;}.card.list.svelte-2gevwt .meta:where(.svelte-2gevwt) {min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px;}.card.list.svelte-2gevwt .title:where(.svelte-2gevwt) {-webkit-line-clamp:1;font-weight:500;}\n  /* Score-Badge auf dem Mini-Cover wäre zu eng → in der Zeile nur als Text */.card.list.svelte-2gevwt .cover:where(.svelte-2gevwt) .score:where(.svelte-2gevwt) {display:none;}'
};

function Card($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$a);

	let list = prop($$props, 'list', 3, false);
	var button = root_9$7();
	let classes;
	var div = child(button);
	var node = child(div);

	{
		var consequent = ($$anchor) => {
			var img = root$a();

			template_effect(() => set_attribute(img, 'src', $$props.media.cover_url));
			append($$anchor, img);
		};

		var alternate = ($$anchor) => {
			var div_1 = root_1$a();
			var text = only_child(div_1, true);

			template_effect(() => set_text(text, $$props.media.title?.[0] ?? '?'));
			append($$anchor, div_1);
		};

		if_block(node, ($$render) => {
			if ($$props.media.cover_url) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_1 = sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var span = root_2$a();

			append($$anchor, span);
		};

		if_block(node_1, ($$render) => {
			if ($$props.media.dub_de) $$render(consequent_1);
		});
	}

	var node_2 = sibling(node_1, 2);

	{
		var consequent_2 = ($$anchor) => {
			var span_1 = root_3$9();
			var text_1 = only_child(span_1);

			template_effect(() => set_text(text_1, `★ ${$$props.media.rating ?? ''}`));
			append($$anchor, span_1);
		};

		if_block(node_2, ($$render) => {
			if ($$props.media.rating) $$render(consequent_2);
		});
	}

	var node_3 = sibling(node_2, 2);

	{
		var consequent_3 = ($$anchor) => {
			var span_2 = root_4$9();

			append($$anchor, span_2);
		};

		if_block(node_3, ($$render) => {
			if ($$props.media.collection === 'owned') $$render(consequent_3);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_4 = ($$anchor) => {
			var span_3 = root_5$8();
			var text_2 = only_child(span_3);

			template_effect(() => set_text(text_2, `${$$props.media.average_score ?? ''}%`));
			append($$anchor, span_3);
		};

		if_block(node_4, ($$render) => {
			if ($$props.media.average_score) $$render(consequent_4);
		});
	}

	var div_2 = sibling(div, 2);
	var div_3 = child(div_2);
	var text_3 = only_child(div_3, true);
	var div_4 = sibling(div_3, 2);
	var node_5 = child(div_4);

	{
		var consequent_5 = ($$anchor) => {
			var span_4 = root_6$8();
			var text_4 = only_child(span_4, true);

			template_effect(() => set_text(text_4, $$props.media.season_year));
			append($$anchor, span_4);
		};

		if_block(node_5, ($$render) => {
			if ($$props.media.season_year) $$render(consequent_5);
		});
	}

	var node_6 = sibling(node_5, 2);

	{
		var consequent_6 = ($$anchor) => {
			var span_5 = root_6$8();
			var text_5 = only_child(span_5, true);

			template_effect(() => set_text(text_5, $$props.media.format));
			append($$anchor, span_5);
		};

		if_block(node_6, ($$render) => {
			if ($$props.media.format) $$render(consequent_6);
		});
	}

	var node_7 = sibling(node_6, 2);

	{
		var consequent_7 = ($$anchor) => {
			var span_6 = root_7$7();
			var text_6 = only_child(span_6);

			template_effect(() => set_text(text_6, `${$$props.media.average_score ?? ''}%`));
			append($$anchor, span_6);
		};

		if_block(node_7, ($$render) => {
			if (list() && $$props.media.average_score) $$render(consequent_7);
		});
	}

	var node_8 = sibling(div_4, 2);

	{
		var consequent_8 = ($$anchor) => {
			var div_5 = root_8$7();
			var text_7 = only_child(div_5, true);

			template_effect(($0) => set_text(text_7, $0), [() => $$props.media.genres.slice(0, 4).join(' · ')]);
			append($$anchor, div_5);
		};

		if_block(node_8, ($$render) => {
			if (list() && $$props.media.genres) $$render(consequent_8);
		});
	}

	template_effect(() => {
		classes = set_class(button, 1, 'card svelte-2gevwt', null, classes, { list: list() });
		set_text(text_3, $$props.media.title);
	});

	delegated('click', button, () => $$props.onopen($$props.media));
	append($$anchor, button);
	pop();
}

delegate(['click']);

var root$9 = from_html(`<img alt="" class="svelte-90l7ri"/>`);
var root_1$9 = from_html(`<div class="cover-ph svelte-90l7ri"> </div>`);
var root_2$9 = from_html(`<span class="dot svelte-90l7ri"></span> `, 1);
var root_3$8 = from_html(`<div class="alts svelte-90l7ri"> </div>`);
var root_4$8 = from_html(`<span class="badge score svelte-90l7ri"><span class="smile svelte-90l7ri">☺</span> </span>`);
var root_5$7 = from_html(`<span class="badge mine svelte-90l7ri"> </span>`);
var root_6$7 = from_html(`<span class="badge pop svelte-90l7ri"> </span>`);
var root_7$6 = from_html(`<span class="badge dub svelte-90l7ri"> </span>`);
var root_8$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Format</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_9$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Folgen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_10$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Status</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_11$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Saison</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_12$5 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Studios</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_13$5 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Quelle</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_14$4 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Herkunftsland</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_15$4 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Begonnen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_16$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Abgeschlossen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_17$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Wiederholt</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_18$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Nächste Folge</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_19$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Ø Wertung</dt><dd class="score svelte-90l7ri"> </dd></div>`);
var root_20$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Beliebtheit</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_21$1 = from_html(`<span class="dubval svelte-90l7ri"> </span>`);
var root_22$1 = from_html(`<span class="muted svelte-90l7ri">nicht erfasst</span>`);
var root_23$1 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Deine Wertung</dt><dd class="mine svelte-90l7ri"> </dd></div>`);
var root_24$1 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Sammlung</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_25$1 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Romaji</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_26 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Englisch</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_27 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Nativ</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_28 = from_html(`<span class="chip svelte-90l7ri"> </span>`);
var root_29 = from_html(`<div class="side-block svelte-90l7ri"><h4 class="svelte-90l7ri">Genres</h4> <div class="chips svelte-90l7ri"></div></div>`);
var root_30 = from_html(`<div class="side-block svelte-90l7ri"><h4 class="svelte-90l7ri">Tags</h4> <div class="chips svelte-90l7ri"></div></div>`);
var root_31 = from_html(`<span class="lock svelte-90l7ri">🔒</span>`);
var root_32 = from_html(`<button> <!></button>`);
var root_33 = from_html(`<section class="block svelte-90l7ri"><p class="desc svelte-90l7ri"></p></section>`);
var root_34 = from_html(`<a class="svc svelte-90l7ri" target="_blank" rel="noopener"> </a>`);
var root_35 = from_html(`<section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Wo schauen</h3> <div class="btnrow svelte-90l7ri"></div></section>`);
var root_36 = from_html(`<a class="svc ghost svelte-90l7ri" target="_blank" rel="noopener"> </a>`);
var root_37 = from_html(`<section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Infoseiten</h3> <div class="btnrow svelte-90l7ri"></div></section>`);
var root_38 = from_html(`<option> </option>`);
var root_39 = from_html(`<span class="of svelte-90l7ri"> </span>`);
var root_40 = from_html(`<button type="button"> </button>`);
var root_41 = from_html(`<div class="field svelte-90l7ri"><label for="e-lent" class="svelte-90l7ri">Verliehen an (optional)</label> <input id="e-lent" placeholder="leer = im Regal" class="svelte-90l7ri"/></div>`);
var root_42 = from_html(`<div class="modal-scrim svelte-90l7ri" role="presentation"></div> <div class="modal svelte-90l7ri" role="dialog" aria-modal="true" aria-label="Eintrag bearbeiten"><div class="modal-head svelte-90l7ri"><h2 class="svelte-90l7ri">Eintrag bearbeiten</h2> <button class="close sm svelte-90l7ri" aria-label="Schließen">✕</button></div> <div class="modal-title svelte-90l7ri"> </div> <div class="modal-body svelte-90l7ri"><div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-status" class="svelte-90l7ri">Status</label> <select id="e-status" class="svelte-90l7ri"></select></div> <div class="field svelte-90l7ri"><label for="e-score" class="svelte-90l7ri">Punktzahl (1–10)</label> <input id="e-score" type="number" min="0" max="10" step="1" placeholder="—" class="svelte-90l7ri"/></div></div> <div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-prog" class="svelte-90l7ri">Fortschritt <!></label> <input id="e-prog" type="number" min="0" placeholder="0" class="svelte-90l7ri"/></div> <div class="field svelte-90l7ri"><label for="e-reps" class="svelte-90l7ri">Wiederholungen</label> <input id="e-reps" type="number" min="0" placeholder="0" class="svelte-90l7ri"/></div></div> <div class="field svelte-90l7ri"><span class="fl svelte-90l7ri">Sammlung</span> <div class="seg svelte-90l7ri"></div></div> <!> <div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-start" class="svelte-90l7ri">Startdatum</label> <input id="e-start" type="date" class="svelte-90l7ri"/></div> <div class="field svelte-90l7ri"><label for="e-end" class="svelte-90l7ri">Enddatum</label> <input id="e-end" type="date" class="svelte-90l7ri"/></div></div> <div class="field svelte-90l7ri"><label for="e-note" class="svelte-90l7ri">Notiz</label> <textarea id="e-note" rows="3" placeholder="eigene Notiz…" class="svelte-90l7ri"></textarea></div></div> <div class="modal-foot svelte-90l7ri"><button class="btn ghost svelte-90l7ri">Abbrechen</button> <button class="btn primary svelte-90l7ri">Speichern</button></div></div>`, 1);
var root_43 = from_html(`<div class="overlay svelte-90l7ri" role="dialog" aria-modal="true"><button class="close svelte-90l7ri" aria-label="Schließen">✕</button> <div><div class="banner-fade svelte-90l7ri"></div></div> <div class="headwrap svelte-90l7ri"><div class="container head-grid svelte-90l7ri"><div class="poster-col svelte-90l7ri"><div class="cover svelte-90l7ri"><!></div> <div class="poster-actions svelte-90l7ri"><button class="addbtn svelte-90l7ri"><!></button> <button aria-label="Favorit" title="Favorit">♥</button></div></div> <div class="head-main svelte-90l7ri"><h1 class="svelte-90l7ri"> </h1> <!> <div class="badges svelte-90l7ri"><!> <!> <!> <!></div> <div class="head-actions svelte-90l7ri"><button class="edit svelte-90l7ri">Bearbeiten</button></div></div></div></div> <div class="container body-grid svelte-90l7ri"><aside class="sidebar svelte-90l7ri"><dl class="data svelte-90l7ri"><!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <div class="svelte-90l7ri"><dt class="svelte-90l7ri">Dub</dt> <dd class="svelte-90l7ri"><!></dd></div> <!> <!> <!> <!> <!></dl> <!> <!></aside> <main class="content svelte-90l7ri"><nav class="tabs svelte-90l7ri" aria-label="Reiter"></nav> <!> <!> <!> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Status-Verteilung</h3> <div class="placeholder svelte-90l7ri">Noch keine Community-Daten importiert.</div></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Wertungs-Verteilung</h3> <div class="placeholder svelte-90l7ri">Noch keine Community-Daten importiert.</div></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Beziehungen</h3> <div class="placeholder svelte-90l7ri">Noch nicht importiert.</div></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Charaktere</h3> <div class="placeholder svelte-90l7ri">Noch nicht importiert.</div></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Empfehlungen</h3> <div class="placeholder svelte-90l7ri">Noch nicht importiert.</div></section></main></div></div> <!>`, 1);

const $$css$9 = {
	hash: 'svelte-90l7ri',
	code: '.overlay.svelte-90l7ri {position:fixed;inset:0;z-index:40;overflow-y:auto;overflow-x:hidden;background:var(--bg);}.close.svelte-90l7ri {position:fixed;top:16px;right:18px;z-index:50;width:36px;height:36px;border-radius:50%;border:0;cursor:pointer;background:rgba(0, 0, 0, 0.5);color:#fff;font-size:1rem;backdrop-filter:blur(4px);}.close.svelte-90l7ri:hover {background:rgba(0, 0, 0, 0.7);}\n\n  /* Voll-Banner */.banner.svelte-90l7ri {position:relative;width:100%;height:330px;background-size:cover;background-position:center 25%;}.banner.empty.svelte-90l7ri {background:linear-gradient(135deg, var(--accent), var(--accent-2));}.banner-fade.svelte-90l7ri {position:absolute;inset:0;background:linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 40%, color-mix(in srgb, var(--surface) 55%, transparent) 100%);}.container.svelte-90l7ri {max-width:var(--maxw);margin:0 auto;padding:0 clamp(16px, 4vw, var(--pad));}\n\n  /* Kopf: Surface-Streifen hinter Titel + Buttons, Cover ragt hoch */.headwrap.svelte-90l7ri {background:var(--surface);box-shadow:var(--shadow-sm);}.head-grid.svelte-90l7ri {display:grid;grid-template-columns:215px 1fr;gap:30px;align-items:start;}.poster-col.svelte-90l7ri {margin-top:-180px;position:relative;z-index:2;display:flex;flex-direction:column;gap:12px;padding-bottom:20px;}.cover.svelte-90l7ri {width:100%;aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;background:var(--surface-2);box-shadow:var(--shadow);}.cover.svelte-90l7ri img:where(.svelte-90l7ri) {width:100%;height:100%;object-fit:cover;display:block;}.cover-ph.svelte-90l7ri {width:100%;height:100%;display:grid;place-items:center;font-size:3rem;font-weight:600;color:var(--text-muted);}.poster-actions.svelte-90l7ri {display:flex;gap:8px;}.addbtn.svelte-90l7ri {flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:0;border-radius:var(--radius);cursor:pointer;background:var(--accent);color:var(--on-accent);font-weight:600;font-size:0.86rem;}.addbtn.svelte-90l7ri:hover {background:var(--accent-dim);}.addbtn.svelte-90l7ri .dot:where(.svelte-90l7ri) {width:8px;height:8px;border-radius:50%;background:var(--on-accent);}.fav.svelte-90l7ri {flex:none;width:42px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-muted);cursor:pointer;font-size:1.05rem;}.fav.svelte-90l7ri:hover {color:var(--bad);}.fav.on.svelte-90l7ri {color:var(--bad);border-color:var(--bad);}.head-main.svelte-90l7ri {padding:24px 0 20px;min-width:0;}h1.svelte-90l7ri {font-size:1.7rem;line-height:1.2;margin:0 0 6px;color:var(--text-strong);font-weight:600;}.alts.svelte-90l7ri {color:var(--text-muted);font-size:0.86rem;margin-bottom:14px;}.badges.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}.badge.svelte-90l7ri {display:inline-flex;align-items:center;gap:5px;font-size:0.78rem;font-weight:600;padding:4px 9px;border-radius:var(--radius);background:var(--surface-2);color:var(--text);}.badge.score.svelte-90l7ri {color:var(--good);}.badge.score.svelte-90l7ri .smile:where(.svelte-90l7ri) {font-size:0.9rem;}.badge.mine.svelte-90l7ri {color:var(--gold);}.badge.dub.svelte-90l7ri {color:var(--accent);}.head-actions.svelte-90l7ri {display:flex;gap:10px;}.edit.svelte-90l7ri {padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:0.84rem;font-weight:600;}.edit.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}\n\n  /* Körper */.body-grid.svelte-90l7ri {display:grid;grid-template-columns:215px 1fr;gap:30px;padding-top:28px;padding-bottom:60px;}.sidebar.svelte-90l7ri {display:flex;flex-direction:column;gap:18px;}.data.svelte-90l7ri {margin:0;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;}.data.svelte-90l7ri > div:where(.svelte-90l7ri) {min-width:0;}.data.svelte-90l7ri dt:where(.svelte-90l7ri) {font-size:0.7rem;color:var(--text-muted);margin:0 0 2px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;}.data.svelte-90l7ri dd:where(.svelte-90l7ri) {margin:0;font-size:0.86rem;color:var(--text-strong);font-weight:500;word-break:break-word;}.data.svelte-90l7ri dd.score:where(.svelte-90l7ri) {color:var(--good);}.data.svelte-90l7ri dd.mine:where(.svelte-90l7ri) {color:var(--gold);}.data.svelte-90l7ri .dubval:where(.svelte-90l7ri) {color:var(--accent);font-weight:600;}.data.svelte-90l7ri .muted:where(.svelte-90l7ri) {color:var(--text-muted);font-weight:400;}.side-block.svelte-90l7ri h4:where(.svelte-90l7ri) {font-size:0.7rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:700;margin:0 0 8px;}.chips.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:6px;}.chip.svelte-90l7ri {font-size:0.74rem;padding:4px 10px;border-radius:var(--radius);background:var(--surface-2);color:var(--text);font-weight:500;}\n\n  /* Inhalt rechts */.content.svelte-90l7ri {min-width:0;}.tabs.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px;}.tab.svelte-90l7ri {padding:10px 14px;border:0;background:none;cursor:pointer;color:var(--text-muted);font-size:0.86rem;font-weight:600;border-bottom:2px solid transparent;margin-bottom:-1px;}.tab.svelte-90l7ri:hover:not(:disabled) {color:var(--text);}.tab.active.svelte-90l7ri {color:var(--accent);border-bottom-color:var(--accent);}.tab.svelte-90l7ri:disabled {cursor:not-allowed;opacity:0.55;}.tab.svelte-90l7ri .lock:where(.svelte-90l7ri) {margin-left:5px;font-size:0.72rem;}.block.svelte-90l7ri {margin-bottom:30px;}.block.svelte-90l7ri h3:where(.svelte-90l7ri) {font-size:0.78rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:700;margin:0 0 12px;}.desc.svelte-90l7ri {margin:0;color:var(--text);line-height:1.65;font-size:0.92rem;}.btnrow.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:8px;}.svc.svelte-90l7ri {padding:8px 14px;border-radius:var(--radius);background:var(--accent);color:var(--on-accent);font-size:0.82rem;font-weight:600;}.svc.svelte-90l7ri:hover {background:var(--accent-dim);}.svc.ghost.svelte-90l7ri {background:var(--surface-2);color:var(--text);border:1px solid var(--border);}.svc.ghost.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}.placeholder.svelte-90l7ri {padding:22px;border:1px dashed var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text-muted);font-size:0.84rem;text-align:center;}\n\n  /* ---------- Bearbeiten-Modal ---------- */.modal-scrim.svelte-90l7ri {position:fixed;inset:0;z-index:60;background:rgba(0, 0, 0, 0.6);}.modal.svelte-90l7ri {position:fixed;z-index:61;top:50%;left:50%;transform:translate(-50%, -50%);width:min(520px, calc(100% - 32px));max-height:calc(100% - 48px);overflow-y:auto;background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);border:1px solid var(--border);}.modal-head.svelte-90l7ri {display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;}.modal-head.svelte-90l7ri h2:where(.svelte-90l7ri) {margin:0;font-size:1.05rem;color:var(--text-strong);font-weight:600;}.close.sm.svelte-90l7ri {position:static;width:30px;height:30px;background:var(--surface-2);color:var(--text-muted);backdrop-filter:none;}.close.sm.svelte-90l7ri:hover {color:var(--text);background:var(--surface-2);}.modal-title.svelte-90l7ri {padding:2px 20px 0;color:var(--accent);font-size:0.86rem;font-weight:600;}.modal-body.svelte-90l7ri {padding:16px 20px;display:flex;flex-direction:column;gap:14px;}.grid2.svelte-90l7ri {display:grid;grid-template-columns:1fr 1fr;gap:14px;}.field.svelte-90l7ri {display:flex;flex-direction:column;min-width:0;}.field.svelte-90l7ri label:where(.svelte-90l7ri), .field.svelte-90l7ri .fl:where(.svelte-90l7ri) {font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;}.field.svelte-90l7ri .of:where(.svelte-90l7ri) {color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0;}select.svelte-90l7ri, input.svelte-90l7ri, textarea.svelte-90l7ri {width:100%;padding:9px 11px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:0.86rem;font-family:inherit;}select.svelte-90l7ri:focus, input.svelte-90l7ri:focus, textarea.svelte-90l7ri:focus {outline:none;border-color:var(--accent);}textarea.svelte-90l7ri {resize:vertical;line-height:1.5;}.seg.svelte-90l7ri {display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}.seg.svelte-90l7ri button:where(.svelte-90l7ri) {flex:1;padding:9px 4px;border:0;background:var(--surface-2);color:var(--text-muted);cursor:pointer;font-size:0.82rem;}.seg.svelte-90l7ri button:where(.svelte-90l7ri):hover {color:var(--text);}.seg.svelte-90l7ri button.on:where(.svelte-90l7ri) {background:var(--accent);color:var(--on-accent);font-weight:600;}.modal-foot.svelte-90l7ri {display:flex;justify-content:flex-end;gap:10px;padding:0 20px 20px;}.btn.svelte-90l7ri {padding:9px 18px;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;font-size:0.86rem;font-weight:600;}.btn.ghost.svelte-90l7ri {background:var(--surface-2);color:var(--text);}.btn.ghost.svelte-90l7ri:hover {color:var(--text-strong);}.btn.primary.svelte-90l7ri {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.btn.primary.svelte-90l7ri:hover {background:var(--accent-dim);}\n\n  /* ---------- Responsive ---------- */\n  @media (max-width: 880px) {.head-grid.svelte-90l7ri, .body-grid.svelte-90l7ri {grid-template-columns:150px 1fr;gap:20px;}.poster-col.svelte-90l7ri {margin-top:-120px;}h1.svelte-90l7ri {font-size:1.4rem;}\n  }\n  @media (max-width: 620px) {.banner.svelte-90l7ri {height:200px;}.head-grid.svelte-90l7ri {grid-template-columns:110px 1fr;gap:16px;}.poster-col.svelte-90l7ri {margin-top:-70px;min-width:0;}.poster-actions.svelte-90l7ri {flex-direction:column;gap:6px;}.poster-actions.svelte-90l7ri .addbtn:where(.svelte-90l7ri), .poster-actions.svelte-90l7ri .fav:where(.svelte-90l7ri) {width:100%;min-width:0;font-size:0.74rem;padding:8px 4px;}.body-grid.svelte-90l7ri {grid-template-columns:1fr;}.head-main.svelte-90l7ri {padding-top:16px;}.grid2.svelte-90l7ri {grid-template-columns:1fr;}\n  }'
};

function Detail($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$9);

	const SEASON_DE = {
		WINTER: 'Winter',
		SPRING: 'Frühling',
		SUMMER: 'Sommer',
		FALL: 'Herbst'
	};

	const SOURCE_DE = {
		MANGA: 'Manga',
		LIGHT_NOVEL: 'Light Novel',
		WEB_NOVEL: 'Web Novel',
		NOVEL: 'Roman',
		ORIGINAL: 'Original',
		VISUAL_NOVEL: 'Visual Novel',
		VIDEO_GAME: 'Videospiel',
		ANIME: 'Anime',
		GAME: 'Spiel',
		OTHER: 'Sonstiges',
		DOUJINSHI: 'Doujinshi',
		LIVE_ACTION: 'Realfilm',
		COMIC: 'Comic',
		MULTIMEDIA_PROJECT: 'Multimedia-Projekt',
		PICTURE_BOOK: 'Bilderbuch'
	};

	const COUNTRY_DE = { JP: 'Japan', CN: 'China', KR: 'Südkorea', TW: 'Taiwan' };
	let services = prop($$props, 'services', 19, () => []);
	let m = proxy({ ...$$props.media });

	const WATCH = [
		['none', '—'],
		['watching', 'Beobachten'],
		['rewatching', 'Wiederanschauen'],
		['completed', 'Abgeschlossen'],
		['paused', 'Pausiert'],
		['dropped', 'Fallen Gelassen'],
		['planning', 'Planung']
	];

	const COLL = [['none', '—'], ['wish', 'Wunsch'], ['owned', 'Im Regal']];

	const FORMAT = {
		TV: 'Fernseher',
		TV_SHORT: 'TV-Kurzfilm',
		MOVIE: 'Film',
		SPECIAL: 'Spezial',
		OVA: 'OVA',
		ONA: 'ONA',
		MUSIC: 'Musik'
	};

	const LINK_LABEL = {
		anilist: 'AniList',
		mal: 'MyAnimeList',
		anisearch: 'aniSearch'
	};

	const fmtFormat = (f) => f ? FORMAT[f] ?? f : '';
	const watchLabel = (v) => WATCH.find(([k]) => k === v)?.[1] ?? '—';
	const inList = user_derived(() => !!m.watch_status && m.watch_status !== 'none');

	// Favorit (♥) — wird gespeichert und ist über den Favoriten-Filter ansehbar.
	let fav = state(!!$$props.media.favorite);

	function toggleFav() {
		set(fav, !get(fav));
		patch({ favorite: get(fav) ? 1 : 0 });
	}

	// --- Bearbeiten-Modal ---------------------------------------------------
	let editing = state(false);

	// Formular-Spiegel (nur beim Öffnen befüllt)
	let fStatus = state('none');

	let fScore = state(null);
	let fProgress = state(null);
	let fColl = state('none');
	let fNote = state('');
	let fLent = state('');

	// Nur-UI Felder (werden NICHT gepatcht — keine Backend-Felder vorhanden)
	let fStart = state('');

	let fEnd = state('');
	let fRepeats = state(null);

	function openEdit() {
		set(fStatus, m.watch_status ?? 'none', true);
		set(fScore, m.rating ?? null, true);
		set(fProgress, m.progress ?? null, true);
		set(fColl, m.collection ?? 'none', true);
		set(fNote, m.note ?? '', true);
		set(fLent, m.lent_to ?? '', true);
		set(editing, true);
	}

	async function patch(p) {
		Object.assign(m, p);

		try {
			await api.patchEntry(m.id, p);
			$$props.onchange?.({ ...m });
		} catch(e) {
			console.error(e);
		}
	}

	async function saveEdit() {
		// Nur vorhandene Backend-Felder patchen
		const p = {
			watch_status: get(fStatus),
			rating: get(fScore),
			progress: get(fProgress),
			collection: get(fColl),
			note: get(fNote),
			lent_to: get(fColl) === 'owned' ? get(fLent) : ''
		};

		set(editing, false);
		await patch(p);
	}

	function serviceUrl(schema) {
		const q = encodeURIComponent(m.title_romaji || m.title_english || m.title || '');

		return schema.replace('{q}', q).replace('{slug}', q);
	}

	// Reiter (nur „Übersicht" aktiv; Rest 🔒 bis Import)
	const TABS = [
		{ id: 'overview', label: 'Übersicht' },
		{ id: 'characters', label: 'Charaktere', locked: true },
		{ id: 'staff', label: 'Mitwirkende', locked: true },
		{ id: 'stats', label: 'Statistiken', locked: true }
	];

	let tab = state('overview');
	const alts = user_derived(() => [m.title_romaji, m.title_english, m.title_native].filter((t) => t && t !== m.title));
	var fragment = root_43();
	var div = first_child(fragment);
	var button = child(div);
	var div_1 = sibling(button, 2);
	let classes;
	var div_2 = sibling(div_1, 2);
	var div_3 = child(div_2);
	var div_4 = child(div_3);
	var div_5 = child(div_4);
	var node = child(div_5);

	{
		var consequent = ($$anchor) => {
			var img = root$9();

			template_effect(() => set_attribute(img, 'src', m.cover_url));
			append($$anchor, img);
		};

		var alternate = ($$anchor) => {
			var div_6 = root_1$9();
			var text = only_child(div_6, true);

			template_effect(() => set_text(text, m.title?.[0] ?? '?'));
			append($$anchor, div_6);
		};

		if_block(node, ($$render) => {
			if (m.cover_url) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var div_7 = sibling(div_5, 2);
	var button_1 = child(div_7);
	var node_1 = child(button_1);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_1 = root_2$9();
			var text_1 = sibling(first_child(fragment_1), 1, true);

			template_effect(($0) => set_text(text_1, $0), [() => watchLabel(m.watch_status)]);
			append($$anchor, fragment_1);
		};

		var alternate_1 = ($$anchor) => {
			var text_2 = text('Zur Liste hinzufügen');

			append($$anchor, text_2);
		};

		if_block(node_1, ($$render) => {
			if (get(inList)) $$render(consequent_1); else $$render(alternate_1, -1);
		});
	}

	var button_2 = sibling(button_1, 2);
	let classes_1;

	var div_8 = sibling(div_4, 2);
	var h1 = child(div_8);
	var text_3 = only_child(h1, true);
	var node_2 = sibling(h1, 2);

	{
		var consequent_2 = ($$anchor) => {
			var div_9 = root_3$8();
			var text_4 = only_child(div_9, true);

			template_effect(($0) => set_text(text_4, $0), [() => get(alts).join(' · ')]);
			append($$anchor, div_9);
		};

		if_block(node_2, ($$render) => {
			if (get(alts).length) $$render(consequent_2);
		});
	}

	var div_10 = sibling(node_2, 2);
	var node_3 = child(div_10);

	{
		var consequent_3 = ($$anchor) => {
			var span = root_4$8();
			var text_5 = sibling(child(span));
			template_effect(() => set_text(text_5, ` ${m.average_score ?? ''}%`));
			append($$anchor, span);
		};

		if_block(node_3, ($$render) => {
			if (m.average_score) $$render(consequent_3);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_4 = ($$anchor) => {
			var span_1 = root_5$7();
			var text_6 = only_child(span_1);

			template_effect(() => set_text(text_6, `★ ${m.rating ?? ''}`));
			append($$anchor, span_1);
		};

		if_block(node_4, ($$render) => {
			if (m.rating) $$render(consequent_4);
		});
	}

	var node_5 = sibling(node_4, 2);

	{
		var consequent_5 = ($$anchor) => {
			var span_2 = root_6$7();
			var text_7 = only_child(span_2);

			template_effect(($0) => set_text(text_7, `Beliebtheit ${$0 ?? ''}`), [() => m.popularity.toLocaleString('de-DE')]);
			append($$anchor, span_2);
		};

		if_block(node_5, ($$render) => {
			if (m.popularity) $$render(consequent_5);
		});
	}

	var node_6 = sibling(node_5, 2);

	{
		var consequent_6 = ($$anchor) => {
			var span_3 = root_7$6();
			var text_8 = only_child(span_3);

			template_effect(() => set_text(text_8, `Deutscher Dub${m.dub_tier ? ` · ${m.dub_tier}` : ''}`));
			append($$anchor, span_3);
		};

		if_block(node_6, ($$render) => {
			if (m.dub_de) $$render(consequent_6);
		});
	}

	var div_11 = sibling(div_10, 2);
	var button_3 = only_child(div_11);

	var div_12 = sibling(div_2, 2);
	var aside = child(div_12);
	var dl = child(aside);
	var node_7 = child(dl);

	{
		var consequent_7 = ($$anchor) => {
			var div_13 = root_8$6();
			var dd = sibling(child(div_13));
			var text_9 = only_child(dd, true);
			template_effect(($0) => set_text(text_9, $0), [() => fmtFormat(m.format)]);
			append($$anchor, div_13);
		};

		if_block(node_7, ($$render) => {
			if (m.format) $$render(consequent_7);
		});
	}

	var node_8 = sibling(node_7, 2);

	{
		var consequent_8 = ($$anchor) => {
			var div_14 = root_9$6();
			var dd_1 = sibling(child(div_14));
			var text_10 = only_child(dd_1, true);
			template_effect(() => set_text(text_10, m.episodes));
			append($$anchor, div_14);
		};

		if_block(node_8, ($$render) => {
			if (m.episodes) $$render(consequent_8);
		});
	}

	var node_9 = sibling(node_8, 2);

	{
		var consequent_9 = ($$anchor) => {
			var div_15 = root_10$6();
			var dd_2 = sibling(child(div_15));
			var text_11 = only_child(dd_2, true);
			template_effect(($0) => set_text(text_11, $0), [() => watchLabel(m.watch_status)]);
			append($$anchor, div_15);
		};

		if_block(node_9, ($$render) => {
			if (get(inList)) $$render(consequent_9);
		});
	}

	var node_10 = sibling(node_9, 2);

	{
		var consequent_10 = ($$anchor) => {
			var div_16 = root_11$6();
			var dd_3 = sibling(child(div_16));
			var text_12 = only_child(dd_3);
			template_effect(() => set_text(text_12, `${m.season ? (SEASON_DE[m.season] ?? m.season) + ' ' : ''}${m.season_year ?? ''}`));
			append($$anchor, div_16);
		};

		if_block(node_10, ($$render) => {
			if (m.season_year) $$render(consequent_10);
		});
	}

	var node_11 = sibling(node_10, 2);

	{
		var consequent_11 = ($$anchor) => {
			var div_17 = root_12$5();
			var dd_4 = sibling(child(div_17));
			var text_13 = only_child(dd_4, true);
			template_effect(($0) => set_text(text_13, $0), [() => m.studios.join(', ')]);
			append($$anchor, div_17);
		};

		if_block(node_11, ($$render) => {
			if (m.studios?.length) $$render(consequent_11);
		});
	}

	var node_12 = sibling(node_11, 2);

	{
		var consequent_12 = ($$anchor) => {
			var div_18 = root_13$5();
			var dd_5 = sibling(child(div_18));
			var text_14 = only_child(dd_5, true);
			template_effect(() => set_text(text_14, SOURCE_DE[m.source] ?? m.source));
			append($$anchor, div_18);
		};

		if_block(node_12, ($$render) => {
			if (m.source) $$render(consequent_12);
		});
	}

	var node_13 = sibling(node_12, 2);

	{
		var consequent_13 = ($$anchor) => {
			var div_19 = root_14$4();
			var dd_6 = sibling(child(div_19));
			var text_15 = only_child(dd_6, true);
			template_effect(() => set_text(text_15, COUNTRY_DE[m.country] ?? m.country));
			append($$anchor, div_19);
		};

		if_block(node_13, ($$render) => {
			if (m.country) $$render(consequent_13);
		});
	}

	var node_14 = sibling(node_13, 2);

	{
		var consequent_14 = ($$anchor) => {
			var div_20 = root_15$4();
			var dd_7 = sibling(child(div_20));
			var text_16 = only_child(dd_7, true);
			template_effect(() => set_text(text_16, m.started_at));
			append($$anchor, div_20);
		};

		if_block(node_14, ($$render) => {
			if (m.started_at) $$render(consequent_14);
		});
	}

	var node_15 = sibling(node_14, 2);

	{
		var consequent_15 = ($$anchor) => {
			var div_21 = root_16$3();
			var dd_8 = sibling(child(div_21));
			var text_17 = only_child(dd_8, true);
			template_effect(() => set_text(text_17, m.completed_at));
			append($$anchor, div_21);
		};

		if_block(node_15, ($$render) => {
			if (m.completed_at) $$render(consequent_15);
		});
	}

	var node_16 = sibling(node_15, 2);

	{
		var consequent_16 = ($$anchor) => {
			var div_22 = root_17$3();
			var dd_9 = sibling(child(div_22));
			var text_18 = only_child(dd_9);
			template_effect(() => set_text(text_18, `${m.rewatches ?? ''}×`));
			append($$anchor, div_22);
		};

		if_block(node_16, ($$render) => {
			if (m.rewatches) $$render(consequent_16);
		});
	}

	var node_17 = sibling(node_16, 2);

	{
		var consequent_17 = ($$anchor) => {
			var div_23 = root_18$3();
			var dd_10 = sibling(child(div_23));
			var text_19 = only_child(dd_10);

			template_effect(($0) => set_text(text_19, `Ep. ${m.next_airing_ep ?? ''} · ${$0 ?? ''}`), [
				() => new Date(m.next_airing_at * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
			]);

			append($$anchor, div_23);
		};

		if_block(node_17, ($$render) => {
			if (m.next_airing_ep && m.next_airing_at) $$render(consequent_17);
		});
	}

	var node_18 = sibling(node_17, 2);

	{
		var consequent_18 = ($$anchor) => {
			var div_24 = root_19$3();
			var dd_11 = sibling(child(div_24));
			var text_20 = only_child(dd_11);
			template_effect(() => set_text(text_20, `${m.average_score ?? ''}%`));
			append($$anchor, div_24);
		};

		if_block(node_18, ($$render) => {
			if (m.average_score) $$render(consequent_18);
		});
	}

	var node_19 = sibling(node_18, 2);

	{
		var consequent_19 = ($$anchor) => {
			var div_25 = root_20$2();
			var dd_12 = sibling(child(div_25));
			var text_21 = only_child(dd_12, true);
			template_effect(($0) => set_text(text_21, $0), [() => m.popularity.toLocaleString('de-DE')]);
			append($$anchor, div_25);
		};

		if_block(node_19, ($$render) => {
			if (m.popularity) $$render(consequent_19);
		});
	}

	var div_26 = sibling(node_19, 2);
	var dd_13 = sibling(child(div_26), 2);
	var node_20 = child(dd_13);

	{
		var consequent_20 = ($$anchor) => {
			var span_4 = root_21$1();
			var text_22 = only_child(span_4);

			template_effect(() => set_text(text_22, `Deutsch${m.dub_tier ? ` (${m.dub_tier})` : ''}`));
			append($$anchor, span_4);
		};

		var alternate_2 = ($$anchor) => {
			var span_5 = root_22$1();

			append($$anchor, span_5);
		};

		if_block(node_20, ($$render) => {
			if (m.dub_de) $$render(consequent_20); else $$render(alternate_2, -1);
		});
	}

	var node_21 = sibling(div_26, 2);

	{
		var consequent_21 = ($$anchor) => {
			var div_27 = root_23$1();
			var dd_14 = sibling(child(div_27));
			var text_23 = only_child(dd_14);
			template_effect(() => set_text(text_23, `★ ${m.rating ?? ''}/10`));
			append($$anchor, div_27);
		};

		if_block(node_21, ($$render) => {
			if (m.rating) $$render(consequent_21);
		});
	}

	var node_22 = sibling(node_21, 2);

	{
		var consequent_22 = ($$anchor) => {
			var div_28 = root_24$1();
			var dd_15 = sibling(child(div_28));
			var text_24 = only_child(dd_15, true);
			template_effect(($0) => set_text(text_24, $0), [() => COLL.find(([v]) => v === m.collection)?.[1]]);
			append($$anchor, div_28);
		};

		if_block(node_22, ($$render) => {
			if (m.collection && m.collection !== 'none') $$render(consequent_22);
		});
	}

	var node_23 = sibling(node_22, 2);

	{
		var consequent_23 = ($$anchor) => {
			var div_29 = root_25$1();
			var dd_16 = sibling(child(div_29));
			var text_25 = only_child(dd_16, true);
			template_effect(() => set_text(text_25, m.title_romaji));
			append($$anchor, div_29);
		};

		if_block(node_23, ($$render) => {
			if (m.title_romaji) $$render(consequent_23);
		});
	}

	var node_24 = sibling(node_23, 2);

	{
		var consequent_24 = ($$anchor) => {
			var div_30 = root_26();
			var dd_17 = sibling(child(div_30));
			var text_26 = only_child(dd_17, true);
			template_effect(() => set_text(text_26, m.title_english));
			append($$anchor, div_30);
		};

		if_block(node_24, ($$render) => {
			if (m.title_english) $$render(consequent_24);
		});
	}

	var node_25 = sibling(node_24, 2);

	{
		var consequent_25 = ($$anchor) => {
			var div_31 = root_27();
			var dd_18 = sibling(child(div_31));
			var text_27 = only_child(dd_18, true);
			template_effect(() => set_text(text_27, m.title_native));
			append($$anchor, div_31);
		};

		if_block(node_25, ($$render) => {
			if (m.title_native) $$render(consequent_25);
		});
	}

	var node_26 = sibling(dl, 2);

	{
		var consequent_26 = ($$anchor) => {
			var div_32 = root_29();
			var div_33 = sibling(child(div_32), 2);

			each(div_33, 21, () => m.genres, index, ($$anchor, g) => {
				var span_6 = root_28();
				var text_28 = only_child(span_6, true);

				template_effect(() => set_text(text_28, get(g)));
				append($$anchor, span_6);
			});
			append($$anchor, div_32);
		};

		if_block(node_26, ($$render) => {
			if (m.genres?.length) $$render(consequent_26);
		});
	}

	var node_27 = sibling(node_26, 2);

	{
		var consequent_27 = ($$anchor) => {
			var div_34 = root_30();
			var div_35 = sibling(child(div_34), 2);

			each(div_35, 21, () => m.tags, index, ($$anchor, t) => {
				var span_7 = root_28();
				var text_29 = only_child(span_7, true);

				template_effect(() => set_text(text_29, get(t)));
				append($$anchor, span_7);
			});
			append($$anchor, div_34);
		};

		if_block(node_27, ($$render) => {
			if (m.tags?.length) $$render(consequent_27);
		});
	}

	var main = sibling(aside, 2);
	var nav = child(main);

	each(nav, 21, () => TABS, index, ($$anchor, t) => {
		var button_4 = root_32();
		let classes_2;
		var text_30 = child(button_4);
		var node_28 = sibling(text_30);

		{
			var consequent_28 = ($$anchor) => {
				var span_8 = root_31();

				append($$anchor, span_8);
			};

			if_block(node_28, ($$render) => {
				if (get(t).locked) $$render(consequent_28);
			});
		}

		template_effect(() => {
			classes_2 = set_class(button_4, 1, 'tab svelte-90l7ri', null, classes_2, { active: get(tab) === get(t).id });
			button_4.disabled = get(t).locked;
			set_attribute(button_4, 'title', get(t).locked ? 'Braucht Extra-Import' : '');
			set_text(text_30, get(t).label);
		});

		delegated('click', button_4, () => !get(t).locked && set(tab, get(t).id, true));
		append($$anchor, button_4);
	});

	var node_29 = sibling(nav, 2);

	{
		var consequent_29 = ($$anchor) => {
			var section = root_33();
			var p_1 = child(section);

			html(p_1, () => m.description, true);
			append($$anchor, section);
		};

		if_block(node_29, ($$render) => {
			if (m.description) $$render(consequent_29);
		});
	}

	var node_30 = sibling(node_29, 2);

	{
		var consequent_30 = ($$anchor) => {
			var section_1 = root_35();
			var div_36 = sibling(child(section_1), 2);

			each(div_36, 21, services, index, ($$anchor, s) => {
				var a = root_34();
				var text_31 = only_child(a, true);

				template_effect(
					($0) => {
						set_attribute(a, 'href', $0);
						set_text(text_31, get(s).name);
					},
					[() => serviceUrl(get(s).url_schema)]
				);

				append($$anchor, a);
			});
			append($$anchor, section_1);
		};

		if_block(node_30, ($$render) => {
			if (services().length) $$render(consequent_30);
		});
	}

	var node_31 = sibling(node_30, 2);

	{
		var consequent_31 = ($$anchor) => {
			var section_2 = root_37();
			var div_37 = sibling(child(section_2), 2);

			each(div_37, 21, () => Object.entries(m.info_links), index, ($$anchor, $$item) => {
				var $$array = user_derived(() => to_array(get($$item), 2));
				let k = () => get($$array)[0];
				let url = () => get($$array)[1];
				var a_1 = root_36();
				var text_32 = only_child(a_1, true);

				template_effect(() => {
					set_attribute(a_1, 'href', url());
					set_text(text_32, LINK_LABEL[k()] ?? k());
				});

				append($$anchor, a_1);
			});
			append($$anchor, section_2);
		};

		var d = user_derived(() => m.info_links && Object.keys(m.info_links).length);

		if_block(node_31, ($$render) => {
			if (get(d)) $$render(consequent_31);
		});
	}

	var node_32 = sibling(div, 2);

	{
		var consequent_34 = ($$anchor) => {
			var fragment_2 = root_42();
			var div_38 = first_child(fragment_2);
			var div_39 = sibling(div_38, 2);
			var div_40 = child(div_39);
			var button_5 = sibling(child(div_40), 2);

			var div_41 = sibling(div_40, 2);
			var text_33 = only_child(div_41, true);
			var div_42 = sibling(div_41, 2);
			var div_43 = child(div_42);
			var div_44 = child(div_43);
			var select = sibling(child(div_44), 2);

			each(select, 21, () => WATCH, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_1)[0];
				let l = () => get($$array_1)[1];
				var option = root_38();
				var text_34 = only_child(option, true);
				var option_value = {};

				template_effect(() => {
					set_text(text_34, l());

					if (option_value !== (option_value = v())) {
						option.value = (option.__value = option_value) ?? '';
					}
				});

				append($$anchor, option);
			});
			init_select(select);

			var div_45 = sibling(div_44, 2);
			var input = sibling(child(div_45), 2);

			var div_46 = sibling(div_43, 2);
			var div_47 = child(div_46);
			var label = child(div_47);
			var node_33 = sibling(child(label));

			{
				var consequent_32 = ($$anchor) => {
					var span_9 = root_39();
					var text_35 = only_child(span_9);

					template_effect(() => set_text(text_35, `/ ${m.episodes ?? ''}`));
					append($$anchor, span_9);
				};

				if_block(node_33, ($$render) => {
					if (m.episodes) $$render(consequent_32);
				});
			}

			var input_1 = sibling(label, 2);

			var div_48 = sibling(div_47, 2);
			var input_2 = sibling(child(div_48), 2);

			var div_49 = sibling(div_46, 2);
			var div_50 = sibling(child(div_49), 2);

			each(div_50, 21, () => COLL, index, ($$anchor, $$item) => {
				var $$array_2 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_2)[0];
				let l = () => get($$array_2)[1];
				var button_6 = root_40();
				let classes_3;
				var text_36 = only_child(button_6, true);

				template_effect(() => {
					classes_3 = set_class(button_6, 1, 'svelte-90l7ri', null, classes_3, { on: get(fColl) === v() });
					set_text(text_36, l());
				});

				delegated('click', button_6, () => set(fColl, v(), true));
				append($$anchor, button_6);
			});

			var node_34 = sibling(div_49, 2);

			{
				var consequent_33 = ($$anchor) => {
					var div_51 = root_41();
					var input_3 = sibling(child(div_51), 2);
					bind_value(input_3, () => get(fLent), ($$value) => set(fLent, $$value));
					append($$anchor, div_51);
				};

				if_block(node_34, ($$render) => {
					if (get(fColl) === 'owned') $$render(consequent_33);
				});
			}

			var div_52 = sibling(node_34, 2);
			var div_53 = child(div_52);
			var input_4 = sibling(child(div_53), 2);

			var div_54 = sibling(div_53, 2);
			var input_5 = sibling(child(div_54), 2);

			var div_55 = sibling(div_52, 2);
			var textarea = sibling(child(div_55), 2);

			var div_56 = sibling(div_42, 2);
			var button_7 = child(div_56);
			var button_8 = sibling(button_7, 2);

			template_effect(() => {
				set_text(text_33, m.title);
				set_value(input, get(fScore) ?? '');
				set_value(input_1, get(fProgress) ?? '');
				set_value(input_2, get(fRepeats) ?? '');
			});

			delegated('click', div_38, () => set(editing, false));
			delegated('click', button_5, () => set(editing, false));
			bind_select_value(select, () => get(fStatus), ($$value) => set(fStatus, $$value));

			delegated('input', input, (e) => {
				const v = e.currentTarget.value;

				set(fScore, v === '' ? null : Math.max(0, Math.min(10, Number(v))), true);
			});

			delegated('input', input_1, (e) => {
				const v = e.currentTarget.value;

				set(fProgress, v === '' ? null : Math.max(0, Number(v)), true);
			});

			delegated('input', input_2, (e) => {
				const v = e.currentTarget.value;

				set(fRepeats, v === '' ? null : Math.max(0, Number(v)), true);
			});

			bind_value(input_4, () => get(fStart), ($$value) => set(fStart, $$value));
			bind_value(input_5, () => get(fEnd), ($$value) => set(fEnd, $$value));
			bind_value(textarea, () => get(fNote), ($$value) => set(fNote, $$value));
			delegated('click', button_7, () => set(editing, false));
			delegated('click', button_8, saveEdit);
			append($$anchor, fragment_2);
		};

		if_block(node_32, ($$render) => {
			if (get(editing)) $$render(consequent_34);
		});
	}

	template_effect(() => {
		set_attribute(div, 'aria-label', m.title);
		classes = set_class(div_1, 1, 'banner svelte-90l7ri', null, classes, { empty: !m.banner_url });
		set_style(div_1, m.banner_url ? `background-image:url(${m.banner_url})` : '');
		classes_1 = set_class(button_2, 1, 'fav svelte-90l7ri', null, classes_1, { on: get(fav) });
		set_text(text_3, m.title);
	});

	delegated('click', button, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	delegated('click', button_1, openEdit);
	delegated('click', button_2, toggleFav);
	delegated('click', button_3, openEdit);
	append($$anchor, fragment);
	pop();
}

delegate(['click', 'input']);

/* ai.svelte.ts generated by Svelte v5.57.3 */

const aiState = proxy({ enabled: false, loaded: false });

async function refreshAi() {
	try {
		const c = await api.aiConfig();

		aiState.enabled = !!c?.enabled;
	} catch {
		aiState.enabled = false;
	}

	aiState.loaded = true;
}

var root$8 = from_html(`<button> </button>`);
var root_1$8 = from_html(`<button></button>`);
var root_2$8 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Erscheinungsbild</label> <div class="seg svelte-lqmuci"><button>Dunkel</button> <button>Hell</button></div></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Profilfarbe</label> <div class="swatches svelte-lqmuci"></div> <p class="hint svelte-lqmuci">Wie bei AniList — färbt die ganze App. Standard: Rot.</p></div></section>`);
var root_3$7 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Medientypen</label> <button class="big svelte-lqmuci">Medientypen verwalten / Config wählen →</button> <p class="hint svelte-lqmuci">Jede Config ist eigenständig (eigene Genres und Dienste). Anzeige auf Deutsch; Titel in allen Varianten durchsuchbar.</p></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Deutscher Dub — Konfidenz</label> <div class="seg svelte-lqmuci"><button class="on svelte-lqmuci">high</button><button class="svelte-lqmuci">normal</button><button class="svelte-lqmuci">low</button></div> <p class="hint svelte-lqmuci"> </p></div></section>`);
var root_4$7 = from_html(`<div class="svc-row svelte-lqmuci"><span class="svelte-lqmuci"> </span><code class="svelte-lqmuci"> </code><button class="del svelte-lqmuci" aria-label="Entfernen">✕</button></div>`);
var root_5$6 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci"> </label> <!> <div class="addsvc svelte-lqmuci"><input placeholder="Name (z. B. Wakanim)" class="svelte-lqmuci"/> <input class="svelte-lqmuci"/> <button class="big svelte-lqmuci">+ Dienst hinzufügen</button></div> <p class="hint svelte-lqmuci">URL-Schema mit <code class="svelte-lqmuci"></code> als Platzhalter für den Titel, z. B. <code class="svelte-lqmuci"></code>. Auch eigene/private Quellen.</p></div></section>`);
var root_6$6 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0"> </p>`);
var root_7$5 = from_html(`<input type="password" class="svelte-lqmuci"/>`);
var root_8$5 = from_html(`<div class="seg svelte-lqmuci" style="margin-top:12px"><button>OpenAI-kompatibel</button> <button>Ollama</button></div> <input style="margin-top:10px" class="svelte-lqmuci"/> <input placeholder="Modellname, z. B. text-embedding-3-small" class="svelte-lqmuci"/> <!> <button class="big svelte-lqmuci">Speichern</button> <p class="hint svelte-lqmuci">Der Schlüssel liegt nur in der lokalen Datenbank dieses Backends und wird nie zurück an die Oberfläche gesendet. Bei einem Anbieter gehen die Titel-Texte zum Aufbau des Index an dessen Server.</p>`, 1);
var root_9$5 = from_html(`<p class="hint svelte-lqmuci"> <b> </b><!></p> <button class="big svelte-lqmuci"> </button> <button class="link svelte-lqmuci">Index komplett neu aufbauen</button>`, 1);
var root_10$5 = from_html(`<div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Wo läuft das Embedding-Modell?</label> <div class="opts svelte-lqmuci"><label class="opt dis svelte-lqmuci"><input type="radio" disabled="" class="svelte-lqmuci"/> <span><b>Auf diesem Gerät</b> (Handy) — ein kleines Modell wird geladen<br/><i class="svelte-lqmuci">Kommt mit der Handy-Version, noch nicht verfügbar.</i></span></label> <label class="opt svelte-lqmuci"><input type="radio" name="aimode" class="svelte-lqmuci"/> <span><b>Server-Modell</b> — Ollama auf dem Backend-Rechner (bge-m3)</span></label> <label class="opt svelte-lqmuci"><input type="radio" name="aimode" class="svelte-lqmuci"/> <span><b>Externes Modell</b> — eigener Endpunkt oder Anbieter</span></label></div> <!> <button class="big svelte-lqmuci" style="background:var(--surface-2);color:var(--text)">Verbindung testen</button> <!> <p class="hint svelte-lqmuci">Wechselst du das Modell, muss der Index neu aufgebaut werden, weil Vektoren verschiedener Modelle nicht zusammenpassen. Das dauert je nach Modell Minuten bis Stunden.</p></div>`);
var root_11$5 = from_html(`<p class="msg svelte-lqmuci"> </p>`);
var root_12$4 = from_html(`<div class="field svelte-lqmuci"><label class="svelte-lqmuci">KI-Funktionen</label> <div class="seg svelte-lqmuci"><button>Aktiv</button> <button>Aus</button></div> <p class="hint svelte-lqmuci">Schaltet die semantische Suche („KI"-Knopf in Entdecken und Meine Liste) ein. Du suchst damit nach Handlung und Thema statt nach Titeln, zusammen mit allen Filtern.</p></div> <!> <!>`, 1);
var root_13$4 = from_html(`<section class="card svelte-lqmuci"><!></section>`);
var root_14$3 = from_html(`<p class="hint svelte-lqmuci"> </p>`);
var root_15$3 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Zu AniList hochsynchronisieren</label> <p class="hint svelte-lqmuci" style="margin-top:0">Überträgt Status, Wertung und Fortschritt deiner Anime-Liste (nie H). Ohne hinterlegten AniList-Token wird nichts gesendet — die Vorschau zeigt, was übertragen würde.</p> <button class="big svelte-lqmuci">Vorschau laden</button> <!> <button class="big svelte-lqmuci">Jetzt synchronisieren</button> <!></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Daten von AniList importieren</label> <p class="hint svelte-lqmuci" style="margin-top:0">Liest dein <b>öffentliches</b> AniList-Profil (kein Token nötig) und ergänzt Tags, Studios, Saison, Land, Quelle, Start-/Enddatum, Rewatches und Favoriten. Status, Wertung und Fortschritt bleiben unverändert.</p> <input placeholder="AniList-Benutzername" class="svelte-lqmuci"/> <button class="big svelte-lqmuci"> </button> <!></div></section>`);
var root_16$2 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Export / Backup</label> <button class="big svelte-lqmuci">Als MAL-XML exportieren (Standard)</button> <button class="big svelte-lqmuci">Als JSON-Vollbackup exportieren</button> <p class="hint svelte-lqmuci">MAL-XML importieren AniList/Kitsu/Simkl/MAL. JSON enthält zusätzlich Notizen, Regal &amp; Favoriten.</p></div></section>`);
var root_17$2 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">API: <code class="svelte-lqmuci"> </code></p> <p class="hint svelte-lqmuci">Pair-Token: <code class="svelte-lqmuci"> </code></p> <p class="hint svelte-lqmuci"> </p>`, 1);
var root_18$2 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">Pairing-Info nicht erreichbar.</p>`);
var root_19$2 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">Lade …</p>`);
var root_20$1 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Verbindung (Developer)</label> <!></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">MCP-Server <code class="svelte-lqmuci">fuchs-orbitlist</code></label> <p class="hint svelte-lqmuci" style="margin-top:0">Für KI-Assistenten (Lesen &amp; Schreiben, inkl. KI-Suche mit Filtern). Start über <code class="svelte-lqmuci">backend/mcp_server.py</code>; Einbindung in die MCP-Config des Assistenten (siehe README).</p></div></section>`);
var root_21 = from_html(`<button class="link svelte-lqmuci">Passwort vergessen? Zurücksetzen</button>`);
var root_22 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Privater Bereich (H)</label> <p class="hint svelte-lqmuci"> </p> <input type="password" class="svelte-lqmuci"/> <button class="big svelte-lqmuci"> </button> <!> <!></div></section>`);
var root_23 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Verbindung</label> <p class="hint svelte-lqmuci"> </p> <button class="big svelte-lqmuci"> </button></div></section>`);
var root_24 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Über</label> <p class="hint svelte-lqmuci">Orbitlist — erweiterbarer Medien-Tracker.<br/> <br/> </p></div></section> <!>`, 1);
var root_25 = from_html(`<div class="scrim svelte-lqmuci" role="presentation"></div> <aside class="panel svelte-lqmuci"><header class="svelte-lqmuci"><h2 class="svelte-lqmuci">Einstellungen</h2> <button class="close svelte-lqmuci" aria-label="Schließen">✕</button></header> <nav class="svelte-lqmuci"></nav> <div class="body svelte-lqmuci"><!></div></aside>`, 1);

const $$css$8 = {
	hash: 'svelte-lqmuci',
	code: '.scrim.svelte-lqmuci {position:fixed;inset:0;background:rgba(0, 0, 0, 0.45);z-index:50;}.panel.svelte-lqmuci {position:fixed;top:0;right:0;z-index:51;width:min(480px, 100%);height:100%;overflow-y:auto;background:var(--bg);box-shadow:var(--shadow);}header.svelte-lqmuci {display:flex;justify-content:space-between;align-items:center;padding:20px var(--pad) 16px;}\n  @media (max-width: 560px) {header.svelte-lqmuci, nav.svelte-lqmuci, .body.svelte-lqmuci {padding-left:20px;padding-right:20px;} }header.svelte-lqmuci h2:where(.svelte-lqmuci) {margin:0;font-size:1.15rem;font-weight:500;color:var(--text-strong);}.close.svelte-lqmuci {width:30px;height:30px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.9rem;line-height:1;transition:background 0.15s, color 0.15s;}.close.svelte-lqmuci:hover {background:var(--surface-2);color:var(--text);}nav.svelte-lqmuci {display:flex;gap:4px;padding:0 var(--pad);overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;border-bottom:1px solid var(--border);}nav.svelte-lqmuci button:where(.svelte-lqmuci) {padding:10px 14px;white-space:nowrap;flex:0 0 auto;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.85rem;font-weight:500;margin-bottom:-1px;transition:color 0.15s, border-color 0.15s;}nav.svelte-lqmuci button:where(.svelte-lqmuci):hover {color:var(--text);}nav.svelte-lqmuci button.on:where(.svelte-lqmuci) {color:var(--text-strong);border-bottom-color:var(--accent);}.body.svelte-lqmuci {padding:24px var(--pad) 40px;}.card.svelte-lqmuci {background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:22px 24px;margin-bottom:16px;}.field.svelte-lqmuci {margin-bottom:24px;}.field.last.svelte-lqmuci {margin-bottom:0;}.field.svelte-lqmuci > label:where(.svelte-lqmuci) {display:block;font-size:0.78rem;font-weight:500;letter-spacing:0.02em;color:var(--text-muted);margin-bottom:10px;}.seg.svelte-lqmuci {display:inline-flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}.seg.svelte-lqmuci button:where(.svelte-lqmuci) {padding:8px 18px;border:0;background:var(--surface);color:var(--text-muted);cursor:pointer;font-size:0.85rem;transition:background 0.15s, color 0.15s;}.seg.svelte-lqmuci button:where(.svelte-lqmuci):hover {color:var(--text);}.seg.svelte-lqmuci button:where(.svelte-lqmuci) + button:where(.svelte-lqmuci) {border-left:1px solid var(--border);}.seg.svelte-lqmuci button.on:where(.svelte-lqmuci) {background:var(--accent);color:#fff;font-weight:600;}.swatches.svelte-lqmuci {display:flex;flex-wrap:wrap;gap:10px;}.swatch.svelte-lqmuci {width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;transition:transform 0.1s;}.swatch.svelte-lqmuci:hover {transform:scale(1.1);}.swatch.on.svelte-lqmuci {border-color:var(--text-strong);box-shadow:0 0 0 2px var(--surface) inset;}.big.svelte-lqmuci {width:100%;padding:11px 14px;border-radius:var(--radius);border:0;background:var(--accent);color:#fff;cursor:pointer;font-size:0.88rem;font-weight:500;margin-top:4px;transition:background 0.15s, opacity 0.15s;}.big.svelte-lqmuci:hover {background:var(--accent-dim);}.big.svelte-lqmuci:disabled {opacity:0.45;cursor:default;background:var(--accent);}input.svelte-lqmuci {width:100%;padding:10px 12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:8px;font-size:0.88rem;transition:border-color 0.15s;}input.svelte-lqmuci:focus {outline:none;border-color:var(--accent);}input.svelte-lqmuci::placeholder {color:var(--text-muted);}.opts.svelte-lqmuci {display:flex;flex-direction:column;gap:6px;}.opt.svelte-lqmuci {display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:0.84rem;color:var(--text);margin:0;letter-spacing:0;}.opt.svelte-lqmuci input:where(.svelte-lqmuci) {width:auto;margin:3px 0 0;}.opt.dis.svelte-lqmuci {opacity:0.55;cursor:default;}.opt.svelte-lqmuci i:where(.svelte-lqmuci) {color:var(--text-muted);font-size:0.78rem;}.hint.svelte-lqmuci {font-size:0.8rem;color:var(--text-muted);line-height:1.6;margin:10px 0 0;}.msg.svelte-lqmuci {color:var(--accent);font-size:0.82rem;margin-top:8px;}.link.svelte-lqmuci {background:none;border:0;color:var(--text-muted);font-size:0.78rem;cursor:pointer;margin-top:10px;text-decoration:underline;padding:0;}.link.svelte-lqmuci:hover {color:var(--text);}.svc-row.svelte-lqmuci {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;}.svc-row.svelte-lqmuci span:where(.svelte-lqmuci) {color:var(--text-strong);font-weight:500;}.svc-row.svelte-lqmuci .del:where(.svelte-lqmuci) {flex:0 0 auto;width:24px;height:24px;border-radius:var(--radius);border:0;background:transparent;color:var(--bad);cursor:pointer;transition:background 0.15s;}.svc-row.svelte-lqmuci .del:where(.svelte-lqmuci):hover {background:var(--surface-2);}.svc-row.svelte-lqmuci code:where(.svelte-lqmuci) {color:var(--text-muted);font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%;}.addsvc.svelte-lqmuci {display:flex;flex-direction:column;gap:8px;margin-top:14px;}code.svelte-lqmuci {background:var(--surface-2);padding:1px 5px;border-radius:var(--radius-sm);font-size:0.85em;}'
};

function Settings($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$8);

	let theme = prop($$props, 'theme', 3, 'dark'),
		accent = prop($$props, 'accent', 3, ''),
		services = prop($$props, 'services', 19, () => []),
		activeConfig = prop($$props, 'activeConfig', 3, 'anime'),
		configName = prop($$props, 'configName', 3, 'Anime'),
		stats = prop($$props, 'stats', 19, () => ({})),
		hConfigured = prop($$props, 'hConfigured', 7, false);

	// AniList-Reiter: Profil · Anime & Manga · Listen · Import · Export · Apps · Privat · Über
	const CATS = [
		['profil', 'Profil'],
		['medien', 'Anime & Manga'],
		['listen', 'Listen'],
		['ki', 'KI'],
		['import', 'Import'],
		['export', 'Export'],
		['apps', 'Apps'],
		['privat', 'Privat'],
		['ueber', 'Über']
	];

	let cat = state('profil');

	// AniList „Profile Color" — Akzent-Presets. '' = Standard (Rot, aus theme.css).
	const COLORS = [
		['#e8503a', 'Rot'],
		['#3db4f2', 'Blau'],
		['#c063ff', 'Lila'],
		['#4cca51', 'Grün'],
		['#ef881a', 'Orange'],
		['#ec4899', 'Pink'],
		['#677b94', 'Grau'],
		['#7e57ff', 'Verlauf']
	];

	let curAccent = user_derived(() => accent() || '#e8503a');

	// KI-Reiter: aktivieren + Modellquelle wählen (Gerät / Server / extern)
	let ai = state(null);

	let aiSt = state(null);
	let aiMsg = state('');
	let aiKey = state('');
	let aiBusy = state(false);

	async function loadAi() {
		try {
			set(ai, await api.aiConfig(), true);
			set(aiSt, await api.aiStatus(), true);
		} catch {
			set(aiMsg, 'KI-Konfiguration nicht erreichbar.');
		}
	}

	user_effect(() => {
		if (get(cat) === 'ki' && !get(ai)) loadAi();
	});

	async function saveAi(patch) {
		set(aiMsg, '');

		try {
			set(ai, await api.aiConfigSet(patch), true);
			set(aiSt, await api.aiStatus(), true);
			await refreshAi();
		} catch {
			set(aiMsg, 'Speichern fehlgeschlagen.');
		}
	}

	async function saveExternal() {
		const p = {
			mode: 'external',
			ext_kind: get(ai).ext_kind,
			ext_url: get(ai).ext_url,
			ext_model: get(ai).ext_model
		};

		if (get(aiKey)) p.ext_key = get(aiKey);

		await saveAi(p);
		set(aiKey, '');
	}

	async function testAi() {
		set(aiBusy, true);
		set(aiMsg, '');

		const r = await api.aiTest().catch(() => ({ ok: false, error: 'nicht erreichbar' }));

		set(
			aiMsg,
			r.ok
				? `Verbindung ok — Modell liefert ${r.dim} Dimensionen.`
				: `Fehlgeschlagen: ${r.error}`,
			true
		);

		set(aiBusy, false);
	}

	async function startIndex(rebuild) {
		set(aiMsg, '');

		try {
			await api.aiIndex(rebuild);
			set(aiMsg, 'Index wird im Hintergrund aufgebaut …');

			for (let i = 0; i < 600; i++) {
				await new Promise((r) => setTimeout(r, 2000));
				set(aiSt, await api.aiStatus(), true);

				if (!get(aiSt).indexing?.running) break;
			}

			set(
				aiMsg,
				get(aiSt).indexing?.error
					? `Fehler: ${get(aiSt).indexing.error}`
					: 'Index fertig.',
				true
			);

			set(ai, await api.aiConfig(), true);
			await refreshAi();
		} catch {
			set(aiMsg, 'Index konnte nicht gestartet werden (Modell erreichbar?).');
		}
	}

	// Import-Reiter: Upload der eigenen Liste zu AniList (Token-pflichtig, nur Vorschau ohne Token)
	let syncInfo = state(null);

	let syncMsg = state('');
	let syncBusy = state(false);

	async function loadPreview() {
		set(syncBusy, true);
		set(syncMsg, '');

		try {
			set(syncInfo, await api.syncPreview(), true);
		} catch {
			set(syncMsg, 'Vorschau fehlgeschlagen.');
		}

		set(syncBusy, false);
	}

	async function runSync() {
		set(syncBusy, true);
		set(syncMsg, '');

		try {
			const r = await api.syncRun();

			set(
				syncMsg,
				r.status === 'stub'
					? `Kein AniList-Token hinterlegt — nichts gesendet (${r.would_sync} Einträge würden synchronisiert).`
					: `${r.synced} Einträge zu AniList übertragen.${r.errors?.length ? ' Fehler: ' + r.errors.join('; ') : ''}`,
				true
			);
		} catch {
			set(syncMsg, 'Sync fehlgeschlagen.');
		}

		set(syncBusy, false);
	}

	// AniList-Datenimport (öffentliches Profil, tokenfrei)
	let aniUser = state('');

	let impMsg = state('');
	let impBusy = state(false);

	user_effect(() => {
		if (get(cat) === 'import' && !get(aniUser)) api.anilistUsername().then((d) => {
			if (d?.username) set(aniUser, d.username, true);
		}).catch(() => {});
	});

	async function runImport() {
		if (!get(aniUser).trim()) return;

		set(impBusy, true);
		set(impMsg, '');

		try {
			const r = await api.anilistImport(get(aniUser).trim());

			set(impMsg, `${r.enriched} Titel angereichert (Tags, Studios, Saison, Land, Quelle, Daten), ${r.favorites_added} neue Favoriten übernommen${r.not_in_catalog ? `, ${r.not_in_catalog} nicht im Katalog` : ''}.`);
		} catch {
			set(impMsg, 'Import fehlgeschlagen (Benutzername prüfen / AniList erreichbar?).');
		}

		set(impBusy, false);
	}

	// Apps-Reiter: Pairing-Token + MCP
	let pair = state(null);

	async function loadPair() {
		try {
			set(pair, await api.pairInfo(), true);
		} catch {
			set(pair, { error: true }, true);
		}
	}

	user_effect(() => {
		if (get(cat) === 'apps' && !get(pair)) loadPair();
	});

	let hPw = state('');
	let hMsg = state('');

	async function handleH() {
		set(hMsg, '');

		try {
			if (!hConfigured()) {
				await api.hSetPassword(get(hPw));
				hConfigured(true);
				set(hMsg, 'Passwort gesetzt.');
			}

			await api.hUnlock(get(hPw));
			$$props.onUnlocked(get(hPw));
			set(hPw, '');
			$$props.onOpenPicker(); // Medientyp-Menü öffnen — Hentai erscheint dort jetzt als wählbare Config

			return;
		} catch(e) {
			set(hMsg, 'Falsches Passwort.');
		}

		set(hPw, '');
	}

	async function handleReset() {
		try {
			await api.hReset();
		} catch {}

		hConfigured(false);
		set(hPw, '');
		set(hMsg, 'Zurückgesetzt — jetzt ein neues Passwort festlegen.');
	}

	let svcs = state(proxy([...services()]));

	// Dienste sind pro Config → bei Config-Wechsel neu übernehmen.
	user_effect(() => {
		set(svcs, [...services()], true);
	});

	let newName = state('');
	let newUrl = state('');

	async function addSvc() {
		if (!get(newName).trim() || !get(newUrl).trim()) return;

		const r = await api.addService({
			name: get(newName),
			url_schema: get(newUrl),
			config: activeConfig()
		});

		set(
			svcs,
			[
				...get(svcs),
				{ id: r.id, name: get(newName), url_schema: get(newUrl) }
			],
			true
		);

		set(newName, '');
		set(newUrl, '');
	}

	async function delSvc(id) {
		try {
			await api.deleteService(id);
		} catch {}

		set(svcs, get(svcs).filter((s) => s.id !== id), true);
	}

	var fragment = root_25();
	var div = first_child(fragment);
	var aside = sibling(div, 2);
	var header = child(aside);
	var button = sibling(child(header), 2);

	var nav = sibling(header, 2);

	each(nav, 21, () => CATS, index, ($$anchor, $$item) => {
		var $$array = user_derived(() => to_array(get($$item), 2));
		let id = () => get($$array)[0];
		let label = () => get($$array)[1];
		var button_1 = root$8();
		let classes;
		var text = only_child(button_1, true);

		template_effect(() => {
			classes = set_class(button_1, 1, 'svelte-lqmuci', null, classes, { on: get(cat) === id() });
			set_text(text, label());
		});

		delegated('click', button_1, () => set(cat, id(), true));
		append($$anchor, button_1);
	});

	var div_1 = sibling(nav, 2);
	var node = child(div_1);

	{
		var consequent = ($$anchor) => {
			var section = root_2$8();
			var div_2 = child(section);
			var div_3 = sibling(child(div_2), 2);
			var button_2 = child(div_3);
			let classes_1;
			var button_3 = sibling(button_2, 2);
			let classes_2;

			var div_4 = sibling(div_2, 2);
			var div_5 = sibling(child(div_4), 2);

			each(div_5, 21, () => COLORS, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let hex = () => get($$array_1)[0];
				let name = () => get($$array_1)[1];
				var button_4 = root_1$8();
				let classes_3;

				template_effect(() => {
					classes_3 = set_class(button_4, 1, 'swatch svelte-lqmuci', null, classes_3, { on: get(curAccent) === hex() });
					set_style(button_4, `background:${hex() ?? ''}`);
					set_attribute(button_4, 'title', name());
					set_attribute(button_4, 'aria-label', name());
				});

				delegated('click', button_4, () => $$props.setAccent(hex()));
				append($$anchor, button_4);
			});

			template_effect(() => {
				classes_1 = set_class(button_2, 1, 'svelte-lqmuci', null, classes_1, { on: theme() === 'dark' });
				classes_2 = set_class(button_3, 1, 'svelte-lqmuci', null, classes_2, { on: theme() === 'light' });
			});

			delegated('click', button_2, () => $$props.setTheme('dark'));
			delegated('click', button_3, () => $$props.setTheme('light'));
			append($$anchor, section);
		};

		var consequent_1 = ($$anchor) => {
			var section_1 = root_3$7();
			var div_6 = child(section_1);
			var button_5 = sibling(child(div_6), 2);

			var div_7 = sibling(div_6, 2);
			var p_1 = sibling(child(div_7), 4);
			var text_1 = only_child(p_1);
			template_effect(() => set_text(text_1, `Quelle: ${stats().attribution ?? 'MyDubList (CC BY 4.0)' ?? ''}`));

			delegated('click', button_5, function (...$$args) {
				$$props.onOpenPicker?.apply(this, $$args);
			});

			append($$anchor, section_1);
		};

		var consequent_2 = ($$anchor) => {
			var section_2 = root_5$6();
			var div_8 = child(section_2);
			var label_1 = child(div_8);
			var text_2 = only_child(label_1);
			var node_1 = sibling(label_1, 2);

			each(node_1, 17, () => get(svcs), index, ($$anchor, s) => {
				var div_9 = root_4$7();
				var span = child(div_9);
				var text_3 = only_child(span, true);
				var code = sibling(span);
				var text_4 = only_child(code, true);
				var button_6 = sibling(code);

				template_effect(() => {
					set_text(text_3, get(s).name);
					set_text(text_4, get(s).url_schema);
				});

				delegated('click', button_6, () => delSvc(get(s).id));
				append($$anchor, div_9);
			});

			var div_10 = sibling(node_1, 2);
			var input = child(div_10);

			var input_1 = sibling(input, 2);
			set_attribute(input_1, 'placeholder', 'URL-Schema mit {q}');

			var button_7 = sibling(input_1, 2);

			var p_2 = sibling(div_10, 2);
			var code_1 = sibling(child(p_2));

			code_1.textContent = '{q}';

			var code_2 = sibling(code_1, 2);

			code_2.textContent = 'https://dienst.de/search?q={q}';
			template_effect(() => set_text(text_2, `Streaming-Dienste für ${configName() ?? ''} (eigener Satz je Config)`));
			bind_value(input, () => get(newName), ($$value) => set(newName, $$value));
			bind_value(input_1, () => get(newUrl), ($$value) => set(newUrl, $$value));
			delegated('click', button_7, addSvc);
			append($$anchor, section_2);
		};

		var consequent_10 = ($$anchor) => {
			var section_3 = root_13$4();
			var node_2 = child(section_3);

			{
				var consequent_3 = ($$anchor) => {
					var p_3 = root_6$6();
					var text_5 = only_child(p_3, true);

					template_effect(() => set_text(text_5, get(aiMsg) || 'Lade …'));
					append($$anchor, p_3);
				};

				var alternate = ($$anchor) => {
					var fragment_1 = root_12$4();
					var div_11 = first_child(fragment_1);
					var div_12 = sibling(child(div_11), 2);
					var button_8 = child(div_12);
					let classes_4;
					var button_9 = sibling(button_8, 2);
					let classes_5;

					var node_3 = sibling(div_11, 2);

					{
						var consequent_8 = ($$anchor) => {
							var div_13 = root_10$5();
							var div_14 = sibling(child(div_13), 2);
							var label_2 = sibling(child(div_14), 2);
							var input_2 = child(label_2);

							var label_3 = sibling(label_2, 2);
							var input_3 = child(label_3);

							var node_4 = sibling(div_14, 2);

							{
								var consequent_5 = ($$anchor) => {
									var fragment_2 = root_8$5();
									var div_15 = first_child(fragment_2);
									var button_10 = child(div_15);
									let classes_6;
									var button_11 = sibling(button_10, 2);
									let classes_7;

									var input_4 = sibling(div_15, 2);

									var input_5 = sibling(input_4, 2);

									var node_5 = sibling(input_5, 2);

									{
										var consequent_4 = ($$anchor) => {
											var input_6 = root_7$5();

											template_effect(() => set_attribute(input_6, 'placeholder', get(ai).ext_key_set
												? 'API-Schlüssel gespeichert (zum Ändern neu eingeben)'
												: 'API-Schlüssel (optional)'));

											bind_value(input_6, () => get(aiKey), ($$value) => set(aiKey, $$value));
											append($$anchor, input_6);
										};

										if_block(node_5, ($$render) => {
											if (get(ai).ext_kind === 'openai') $$render(consequent_4);
										});
									}

									var button_12 = sibling(node_5, 2);

									template_effect(() => {
										classes_6 = set_class(button_10, 1, 'svelte-lqmuci', null, classes_6, { on: get(ai).ext_kind === 'openai' });
										classes_7 = set_class(button_11, 1, 'svelte-lqmuci', null, classes_7, { on: get(ai).ext_kind === 'ollama' });

										set_attribute(input_4, 'placeholder', get(ai).ext_kind === 'ollama'
											? 'URL, z. B. http://localhost:11434'
											: 'URL, z. B. https://api.anbieter.de');
									});

									delegated('click', button_10, () => get(ai).ext_kind = 'openai');
									delegated('click', button_11, () => get(ai).ext_kind = 'ollama');
									bind_value(input_4, () => get(ai).ext_url, ($$value) => get(ai).ext_url = $$value);
									bind_value(input_5, () => get(ai).ext_model, ($$value) => get(ai).ext_model = $$value);
									delegated('click', button_12, saveExternal);
									append($$anchor, fragment_2);
								};

								if_block(node_4, ($$render) => {
									if (get(ai).mode === 'external') $$render(consequent_5);
								});
							}

							var button_13 = sibling(node_4, 2);
							var node_6 = sibling(button_13, 2);

							{
								var consequent_7 = ($$anchor) => {
									var fragment_3 = root_9$5();
									var p_4 = first_child(fragment_3);
									var text_6 = child(p_4);
									var b = sibling(text_6);
									var text_7 = only_child(b, true);
									var node_7 = sibling(b);

									{
										var consequent_6 = ($$anchor) => {
											var text_8 = text();

											template_effect(() => set_text(text_8, `· baut auf: ${get(aiSt).indexing.done ?? ''}/${get(aiSt).indexing.total ?? ''}`));
											append($$anchor, text_8);
										};

										if_block(node_7, ($$render) => {
											if (get(aiSt).indexing?.running) $$render(consequent_6);
										});
									}

									var button_14 = sibling(p_4, 2);
									var text_9 = only_child(button_14, true);
									var button_15 = sibling(button_14, 2);

									template_effect(
										($0) => {
											set_text(text_6, `Index: ${get(aiSt).embedded ?? ''} von ${get(aiSt).media ?? ''} Titeln${get(aiSt).problem ? ' · ' : ''}`);
											set_text(text_7, get(aiSt).problem ?? '');
											button_14.disabled = get(aiSt).indexing?.running;
											set_text(text_9, $0);
										},
										[
											() => get(aiSt).problem?.includes('Index passt') ? 'Index neu aufbauen' : 'Neue Titel nachindizieren'
										]
									);

									delegated('click', button_14, () => startIndex(false));
									delegated('click', button_15, () => startIndex(true));
									append($$anchor, fragment_3);
								};

								if_block(node_6, ($$render) => {
									if (get(aiSt)) $$render(consequent_7);
								});
							}

							template_effect(() => {
								set_checked(input_2, get(ai).mode === 'server');
								set_checked(input_3, get(ai).mode === 'external');
								button_13.disabled = get(aiBusy);
							});

							delegated('change', input_2, () => saveAi({ mode: 'server' }));
							delegated('change', input_3, () => get(ai).mode = 'external');
							delegated('click', button_13, testAi);
							append($$anchor, div_13);
						};

						if_block(node_3, ($$render) => {
							if (get(ai).enabled) $$render(consequent_8);
						});
					}

					var node_8 = sibling(node_3, 2);

					{
						var consequent_9 = ($$anchor) => {
							var p_5 = root_11$5();
							var text_10 = only_child(p_5, true);

							template_effect(() => set_text(text_10, get(aiMsg)));
							append($$anchor, p_5);
						};

						if_block(node_8, ($$render) => {
							if (get(aiMsg)) $$render(consequent_9);
						});
					}

					template_effect(() => {
						classes_4 = set_class(button_8, 1, 'svelte-lqmuci', null, classes_4, { on: get(ai).enabled });
						classes_5 = set_class(button_9, 1, 'svelte-lqmuci', null, classes_5, { on: !get(ai).enabled });
					});

					delegated('click', button_8, () => saveAi({ enabled: true }));
					delegated('click', button_9, () => saveAi({ enabled: false }));
					append($$anchor, fragment_1);
				};

				if_block(node_2, ($$render) => {
					if (!get(ai)) $$render(consequent_3); else $$render(alternate, -1);
				});
			}
			append($$anchor, section_3);
		};

		var consequent_14 = ($$anchor) => {
			var section_4 = root_15$3();
			var div_16 = child(section_4);
			var button_16 = sibling(child(div_16), 4);
			var node_9 = sibling(button_16, 2);

			{
				var consequent_11 = ($$anchor) => {
					var p_6 = root_14$3();
					var text_11 = only_child(p_6);

					template_effect(() => set_text(text_11, `${get(syncInfo).count ?? ''} Einträge würden synchronisiert.`));
					append($$anchor, p_6);
				};

				if_block(node_9, ($$render) => {
					if (get(syncInfo)) $$render(consequent_11);
				});
			}

			var button_17 = sibling(node_9, 2);
			var node_10 = sibling(button_17, 2);

			{
				var consequent_12 = ($$anchor) => {
					var p_7 = root_11$5();
					var text_12 = only_child(p_7, true);

					template_effect(() => set_text(text_12, get(syncMsg)));
					append($$anchor, p_7);
				};

				if_block(node_10, ($$render) => {
					if (get(syncMsg)) $$render(consequent_12);
				});
			}

			var div_17 = sibling(div_16, 2);
			var input_7 = sibling(child(div_17), 4);

			var button_18 = sibling(input_7, 2);
			var text_13 = only_child(button_18, true);
			var node_11 = sibling(button_18, 2);

			{
				var consequent_13 = ($$anchor) => {
					var p_8 = root_11$5();
					var text_14 = only_child(p_8, true);

					template_effect(() => set_text(text_14, get(impMsg)));
					append($$anchor, p_8);
				};

				if_block(node_11, ($$render) => {
					if (get(impMsg)) $$render(consequent_13);
				});
			}

			template_effect(
				($0) => {
					button_16.disabled = get(syncBusy);
					button_17.disabled = get(syncBusy);
					button_18.disabled = $0;
					set_text(text_13, get(impBusy) ? 'Importiere …' : 'Von AniList importieren');
				},
				[() => get(impBusy) || !get(aniUser).trim()]
			);

			delegated('click', button_16, loadPreview);
			delegated('click', button_17, runSync);
			delegated('keydown', input_7, (e) => e.key === 'Enter' && runImport());
			bind_value(input_7, () => get(aniUser), ($$value) => set(aniUser, $$value));
			delegated('click', button_18, runImport);
			append($$anchor, section_4);
		};

		var consequent_15 = ($$anchor) => {
			var section_5 = root_16$2();
			var div_18 = child(section_5);
			var button_19 = sibling(child(div_18), 2);
			var button_20 = sibling(button_19, 2);
			delegated('click', button_19, () => downloadExport('mal').catch((e) => alert(e.message)));
			delegated('click', button_20, () => downloadExport('json').catch((e) => alert(e.message)));
			append($$anchor, section_5);
		};

		var consequent_18 = ($$anchor) => {
			var section_6 = root_20$1();
			var div_19 = child(section_6);
			var node_12 = sibling(child(div_19), 2);

			{
				var consequent_16 = ($$anchor) => {
					var fragment_5 = root_17$2();
					var p_9 = first_child(fragment_5);
					var code_3 = sibling(child(p_9));
					var text_15 = only_child(code_3, true);

					var p_10 = sibling(p_9, 2);
					var code_4 = sibling(child(p_10));
					var text_16 = only_child(code_4, true);

					var p_11 = sibling(p_10, 2);
					var text_17 = only_child(p_11, true);

					template_effect(() => {
						set_text(text_15, get(pair).api_base);
						set_text(text_16, get(pair).token);
						set_text(text_17, get(pair).note);
					});

					append($$anchor, fragment_5);
				};

				var consequent_17 = ($$anchor) => {
					var p_12 = root_18$2();

					append($$anchor, p_12);
				};

				var alternate_1 = ($$anchor) => {
					var p_13 = root_19$2();

					append($$anchor, p_13);
				};

				if_block(node_12, ($$render) => {
					if (get(pair) && !get(pair).error) $$render(consequent_16); else if (get(pair)?.error) $$render(consequent_17, 1); else $$render(alternate_1, -1);
				});
			}
			append($$anchor, section_6);
		};

		var consequent_21 = ($$anchor) => {
			var section_7 = root_22();
			var div_20 = child(section_7);
			var p_14 = sibling(child(div_20), 2);
			var text_18 = only_child(p_14);
			var input_8 = sibling(p_14, 2);

			var button_21 = sibling(input_8, 2);
			var text_19 = only_child(button_21, true);
			var node_13 = sibling(button_21, 2);

			{
				var consequent_19 = ($$anchor) => {
					var button_22 = root_21();

					delegated('click', button_22, handleReset);
					append($$anchor, button_22);
				};

				if_block(node_13, ($$render) => {
					if (hConfigured()) $$render(consequent_19);
				});
			}

			var node_14 = sibling(node_13, 2);

			{
				var consequent_20 = ($$anchor) => {
					var p_15 = root_11$5();
					var text_20 = only_child(p_15, true);

					template_effect(() => set_text(text_20, get(hMsg)));
					append($$anchor, p_15);
				};

				if_block(node_14, ($$render) => {
					if (get(hMsg)) $$render(consequent_20);
				});
			}

			template_effect(() => {
				set_text(text_18, `Standardmäßig unsichtbar. ${hConfigured()
					? 'Passwort eingeben zum Entsperren.'
					: 'Lege ein Passwort fest — danach erscheint „Hentai" im Medientyp-Menü (oben neben dem Logo). Verschwindet bei jedem Neuladen wieder.'}`);

				set_attribute(input_8, 'placeholder', hConfigured() ? 'Passwort' : 'Passwort festlegen');
				set_text(text_19, hConfigured() ? 'Entsperren' : 'Passwort setzen & entsperren');
			});

			delegated('keydown', input_8, (e) => e.key === 'Enter' && handleH());
			bind_value(input_8, () => get(hPw), ($$value) => set(hPw, $$value));
			delegated('click', button_21, handleH);
			append($$anchor, section_7);
		};

		var alternate_2 = ($$anchor) => {
			var fragment_6 = root_24();
			var section_8 = first_child(fragment_6);
			var div_21 = child(section_8);
			var p_16 = sibling(child(div_21), 2);
			var text_21 = sibling(child(p_16), 2);
			var text_22 = sibling(text_21, 2);

			var node_15 = sibling(section_8, 2);

			{
				var consequent_22 = ($$anchor) => {
					var section_9 = root_23();
					var div_22 = child(section_9);
					var p_17 = sibling(child(div_22), 2);
					var text_23 = only_child(p_17, true);
					var button_23 = sibling(p_17, 2);
					var text_24 = only_child(button_23, true);

					template_effect(() => {
						set_text(text_23, conn.mode === 'plugin'
							? `Backend: ${conn.server}`
							: 'Dieses Backend ist passwortgeschützt.');

						set_text(text_24, conn.mode === 'plugin' ? 'Verbindung ändern / trennen' : 'Abmelden');
					});

					delegated('click', button_23, () => {
						$$props.onclose();
						disconnect();
					});

					append($$anchor, section_9);
				};

				if_block(node_15, ($$render) => {
					if (conn.mode === 'plugin' || conn.key) $$render(consequent_22);
				});
			}

			template_effect(() => {
				set_text(text_21, ` Daten: AniList, ${stats().attribution ?? 'MyDubList (CC BY 4.0)' ?? ''}, Jikan/MAL (H), TMDB.`);
				set_text(text_22, ` ${stats().anime ?? 0 ?? ''} Anime · ${stats().h ?? 0 ?? ''} H · ${stats().anime_dubbed ?? 0 ?? ''} dt. synchronisiert.`);
			});

			append($$anchor, fragment_6);
		};

		if_block(node, ($$render) => {
			if (get(cat) === 'profil') $$render(consequent); else if (get(cat) === 'medien') $$render(consequent_1, 1); else if (get(cat) === 'listen') $$render(consequent_2, 2); else if (get(cat) === 'ki') $$render(consequent_10, 3); else if (get(cat) === 'import') $$render(consequent_14, 4); else if (get(cat) === 'export') $$render(consequent_15, 5); else if (get(cat) === 'apps') $$render(consequent_18, 6); else if (get(cat) === 'privat') $$render(consequent_21, 7); else $$render(alternate_2, -1);
		});
	}

	delegated('click', div, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	delegated('click', button, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	append($$anchor, fragment);
	pop();
}

delegate(['click', 'change', 'keydown']);

var root$7 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1qjp115"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0"></path></svg>`);
var root_1$7 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1qjp115"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`);
var root_2$7 = from_html(`<span class="err svelte-1qjp115"> </span>`);
var root_3$6 = from_html(`<div class="pwbar svelte-1qjp115"><input type="password" class="svelte-1qjp115"/> <button class="svelte-1qjp115"> </button> <!></div>`);
var root_4$6 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 7c-9 0-15 6-15 16 0 7 4 12 9 15l6 3 6-3c5-3 9-8 9-15 0-10-6-16-15-16Z"></path><path d="M17 23c1.5-2 4-2 5.5 0"></path><path d="M25.5 23c1.5-2 4-2 5.5 0"></path><path d="M20 33c2 1.5 6 1.5 8 0"></path></svg>`);
var root_5$5 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="9" width="32" height="30" rx="2"></rect><path d="M24 9v30"></path><path d="M13 16h7M13 22h7M28 16h7M28 27h7"></path></svg>`);
var root_6$5 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 12c-3-2.5-8-3-13-2v26c5-1 10-.5 13 2 3-2.5 8-3 13-2V10c-5-1-10-.5-13 2Z"></path><path d="M24 12v26"></path></svg>`);
var root_7$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="14" width="32" height="22" rx="2"></rect><path d="M8 20h32"></path><path d="M14 14l-2 6M22 14l-2 6M30 14l-2 6M38 14l-2 6"></path></svg>`);
var root_8$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="16" width="32" height="22" rx="2"></rect><path d="M18 16l6-6 6 6"></path></svg>`);
var root_9$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M12 28v-4a12 12 0 0 1 24 0v4"></path><rect x="8" y="27" width="7" height="11" rx="2"></rect><rect x="33" y="27" width="7" height="11" rx="2"></rect></svg>`);
var root_10$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 8c-7 0-13 5-13 12 0 4 2 7 5 9l-1 7 7-4h2c7 0 13-5 13-12S31 8 24 8Z"></path><circle cx="19" cy="20" r="1.5"></circle><circle cx="29" cy="20" r="1.5"></circle></svg>`);
var root_11$4 = from_html(`<span role="button" tabindex="0" title="Config löschen"> </span>`);
var root_12$3 = from_html(`<button><span class="icon svelte-1qjp115"><!></span> <span class="txt svelte-1qjp115"><span class="name svelte-1qjp115"> </span> <span class="desc svelte-1qjp115"> </span></span> <!></button>`);
var root_13$3 = from_html(`<div class="wrap svelte-1qjp115"><header class="svelte-1qjp115"><div><div class="kicker svelte-1qjp115">Medientyp</div> <h1 class="svelte-1qjp115">Was möchtest du tracken?</h1> <p class="svelte-1qjp115">Jede Config ist ein eigener Bereich. Klick wählt sie aus — der Name oben wechselt mit.</p></div> <div class="hd-actions svelte-1qjp115"><button title="Versteckte Kategorien" aria-label="Versteckte Kategorien"><!></button> <button class="close svelte-1qjp115" aria-label="Schließen">✕</button></div></header> <!> <div class="grid svelte-1qjp115"></div></div>`);

const $$css$7 = {
	hash: 'svelte-1qjp115',
	code: '.wrap.svelte-1qjp115 {position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--bg);padding:calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 40px);}header.svelte-1qjp115 {display:flex;justify-content:space-between;align-items:flex-start;max-width:760px;margin:0 auto 20px;gap:16px;}.kicker.svelte-1qjp115 {color:var(--accent);font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}h1.svelte-1qjp115 {font-size:clamp(1.4rem, 4vw, 2rem);font-weight:800;letter-spacing:-0.02em;margin:4px 0 6px;}header.svelte-1qjp115 p:where(.svelte-1qjp115) {color:var(--text-muted);margin:0;}.hd-actions.svelte-1qjp115 {display:flex;gap:8px;flex:0 0 auto;}.lock.svelte-1qjp115, .close.svelte-1qjp115 {width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer;display:grid;place-items:center;}.lock.svelte-1qjp115 svg:where(.svelte-1qjp115) {width:18px;height:18px;}.lock.on.svelte-1qjp115 {color:var(--accent);border-color:var(--accent);}.pwbar.svelte-1qjp115 {max-width:760px;margin:0 auto 18px;display:flex;gap:8px;align-items:center;}.pwbar.svelte-1qjp115 input:where(.svelte-1qjp115) {flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--surface-2);color:var(--text);}.pwbar.svelte-1qjp115 button:where(.svelte-1qjp115) {padding:10px 16px;border-radius:8px;border:0;background:var(--accent);color:#022;font-weight:700;cursor:pointer;}.pwbar.svelte-1qjp115 .err:where(.svelte-1qjp115) {color:#e0607e;font-size:0.8rem;}.grid.svelte-1qjp115 {max-width:760px;margin:0 auto;display:grid;gap:12px;grid-template-columns:repeat(2, 1fr);}.card.svelte-1qjp115 {position:relative;display:flex;align-items:center;gap:14px;text-align:left;padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);cursor:pointer;transition:border-color 0.15s, transform 0.15s;}.card.svelte-1qjp115:hover {border-color:var(--accent);transform:translateY(-2px);}.card.hidden.svelte-1qjp115 {border-color:color-mix(in srgb, var(--accent-2) 50%, var(--border));}.card.hidden.svelte-1qjp115 .icon:where(.svelte-1qjp115) {color:var(--accent-2);}.icon.svelte-1qjp115 {flex:0 0 auto;width:44px;height:44px;color:var(--accent);}.icon.svelte-1qjp115 svg:where(.svelte-1qjp115) {width:100%;height:100%;}.txt.svelte-1qjp115 {display:flex;flex-direction:column;min-width:0;flex:1;}.name.svelte-1qjp115 {font-weight:700;font-size:1rem;}.desc.svelte-1qjp115 {font-size:0.8rem;color:var(--text-muted);}.del.svelte-1qjp115 {position:absolute;top:8px;right:8px;font-size:0.68rem;color:var(--text-muted);border:1px solid var(--border);padding:2px 7px;border-radius:20px;background:var(--surface-2);line-height:1.4;}.del.svelte-1qjp115:hover {color:#e0607e;border-color:#e0607e;}.del.confirm.svelte-1qjp115 {color:#fff;background:#e0607e;border-color:#e0607e;font-weight:700;}\n  @media (max-width: 640px) {.grid.svelte-1qjp115 {grid-template-columns:1fr;} }'
};

function MediaTypePicker($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$7);

	let startUnlocked = prop($$props, 'startUnlocked', 3, false),
		hToken = prop($$props, 'hToken', 3, null),
		hConfigured = prop($$props, 'hConfigured', 7, false);

	let unlocked = state(proxy(startUnlocked()));
	let types = state(proxy([]));
	let showPw = state(false);
	let pw = state('');
	let msg = state('');
	let confirmDel = state(null);

	async function reload(token) {
		try {
			set(types, await api.mediaTypes(token ?? (get(unlocked) ? hToken() : null)), true);
		} catch {
			set(types, [], true);
		}
	}

	user_effect(() => {
		void get(unlocked);
		void hToken();
		reload();
	});

	async function submitPw() {
		set(msg, '');

		try {
			if (!hConfigured()) {
				await api.hSetPassword(get(pw));
				hConfigured(true);
			}

			await api.hUnlock(get(pw));
			$$props.onUnlockH(get(pw));
			set(unlocked, true);
			set(showPw, false);
			await reload(get(pw));
		} catch {
			set(msg, 'Falsches Passwort.');
		}

		set(pw, '');
	}

	async function del(slug, ev) {
		ev.stopPropagation();

		if (get(confirmDel) !== slug) {
			set(confirmDel, slug, true);

			return;
		}

		try {
			await api.deleteMediaType(slug);
		} catch {}

		set(types, get(types).filter((t) => t.slug !== slug), true);
		set(confirmDel, null);
	}

	var div = root_13$3();
	var header = child(div);
	var div_1 = sibling(child(header), 2);
	var button = child(div_1);
	let classes;
	var node = child(button);

	{
		var consequent = ($$anchor) => {
			var svg = root$7();

			append($$anchor, svg);
		};

		var alternate = ($$anchor) => {
			var svg_1 = root_1$7();

			append($$anchor, svg_1);
		};

		if_block(node, ($$render) => {
			if (get(unlocked)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var button_1 = sibling(button, 2);

	var node_1 = sibling(header, 2);

	{
		var consequent_2 = ($$anchor) => {
			var div_2 = root_3$6();
			var input = child(div_2);

			var button_2 = sibling(input, 2);
			var text = only_child(button_2, true);
			var node_2 = sibling(button_2, 2);

			{
				var consequent_1 = ($$anchor) => {
					var span = root_2$7();
					var text_1 = only_child(span, true);

					template_effect(() => set_text(text_1, get(msg)));
					append($$anchor, span);
				};

				if_block(node_2, ($$render) => {
					if (get(msg)) $$render(consequent_1);
				});
			}

			template_effect(() => {
				set_attribute(input, 'placeholder', hConfigured() ? 'Passwort' : 'Passwort festlegen');
				set_text(text, hConfigured() ? 'Entsperren' : 'Festlegen');
			});

			delegated('keydown', input, (e) => e.key === 'Enter' && submitPw());
			bind_value(input, () => get(pw), ($$value) => set(pw, $$value));
			delegated('click', button_2, submitPw);
			append($$anchor, div_2);
		};

		if_block(node_1, ($$render) => {
			if (get(showPw) && !get(unlocked)) $$render(consequent_2);
		});
	}

	var div_3 = sibling(node_1, 2);

	each(div_3, 21, () => get(types), (t) => t.slug, ($$anchor, t) => {
		var button_3 = root_12$3();
		let classes_1;
		var span_1 = child(button_3);
		var node_3 = child(span_1);

		{
			var consequent_3 = ($$anchor) => {
				var svg_2 = root_4$6();

				append($$anchor, svg_2);
			};

			var consequent_4 = ($$anchor) => {
				var svg_3 = root_5$5();

				append($$anchor, svg_3);
			};

			var consequent_5 = ($$anchor) => {
				var svg_4 = root_6$5();

				append($$anchor, svg_4);
			};

			var consequent_6 = ($$anchor) => {
				var svg_5 = root_7$4();

				append($$anchor, svg_5);
			};

			var consequent_7 = ($$anchor) => {
				var svg_6 = root_8$4();

				append($$anchor, svg_6);
			};

			var consequent_8 = ($$anchor) => {
				var svg_7 = root_9$4();

				append($$anchor, svg_7);
			};

			var alternate_1 = ($$anchor) => {
				var svg_8 = root_10$4();

				append($$anchor, svg_8);
			};

			if_block(node_3, ($$render) => {
				if (get(t).slug === 'anime') $$render(consequent_3); else if (get(t).slug === 'manga') $$render(consequent_4, 1); else if (get(t).slug === 'book') $$render(consequent_5, 2); else if (get(t).slug === 'film') $$render(consequent_6, 3); else if (get(t).slug === 'series') $$render(consequent_7, 4); else if (get(t).slug === 'audiobook') $$render(consequent_8, 5); else $$render(alternate_1, -1);
			});
		}

		var span_2 = sibling(span_1, 2);
		var span_3 = child(span_2);
		var text_2 = only_child(span_3, true);
		var span_4 = sibling(span_3, 2);
		var text_3 = only_child(span_4, true);

		var node_4 = sibling(span_2, 2);

		{
			var consequent_9 = ($$anchor) => {
				var span_5 = root_11$4();
				let classes_2;
				var text_4 = only_child(span_5, true);

				template_effect(() => {
					classes_2 = set_class(span_5, 1, 'del svelte-1qjp115', null, classes_2, { confirm: get(confirmDel) === get(t).slug });
					set_text(text_4, get(confirmDel) === get(t).slug ? 'Löschen?' : '✕');
				});

				delegated('click', span_5, (e) => del(get(t).slug, e));

				delegated('keydown', span_5, (e) => {
					if (e.key === 'Enter') del(get(t).slug, e);
				});

				append($$anchor, span_5);
			};

			if_block(node_4, ($$render) => {
				if (get(t).deletable) $$render(consequent_9);
			});
		}

		template_effect(() => {
			classes_1 = set_class(button_3, 1, 'card svelte-1qjp115', null, classes_1, { hidden: get(t).hidden });
			set_text(text_2, get(t).name);
			set_text(text_3, get(t).description);
		});

		delegated('click', button_3, () => $$props.onpick(get(t)));
		append($$anchor, button_3);
	});
	template_effect(() => classes = set_class(button, 1, 'lock svelte-1qjp115', null, classes, { on: get(unlocked) }));
	delegated('click', button, () => set(showPw, !get(showPw)));

	delegated('click', button_1, function (...$$args) {
		$$props.onclose?.apply(this, $$args);
	});

	append($$anchor, div);
	pop();
}

delegate(['click', 'keydown']);

delegate(['click']);

var root$6 = from_html(`<div class="profile-head svelte-cjprq"><div class="pavatar svelte-cjprq">EF</div> <div class="pmeta svelte-cjprq"><h1 class="svelte-cjprq"> </h1> <p class="svelte-cjprq"> </p></div></div>`);
var root_1$6 = from_html(`<button> </button>`);
var root_2$6 = from_html(`<button class="locked svelte-cjprq" disabled="" title="Braucht zusätzlichen Sync"><span> </span><span class="lock svelte-cjprq">🔒</span></button>`);
var root_3$5 = from_html(`<div class="loading svelte-cjprq">lädt Statistik…</div>`);
var root_4$5 = from_html(`<div class="col svelte-cjprq"><div class="colbar svelte-cjprq"></div> <span class="svelte-cjprq"> </span></div>`);
var root_5$4 = from_html(`<div class="empty inline svelte-cjprq">Noch keine Daten.</div>`);
var root_6$4 = from_html(`<div class="bar svelte-cjprq"><span class="bl svelte-cjprq"> </span> <div class="track svelte-cjprq"><div class="fill svelte-cjprq"></div></div> <span class="bc svelte-cjprq"> </span></div>`);
var root_7$3 = from_html(`<div class="bars svelte-cjprq"></div>`);
var root_8$3 = from_svg(`<circle class="donut-seg svelte-cjprq" cx="21" cy="21" r="15.915"><title> </title></circle>`);
var root_9$3 = from_html(`<li class="svelte-cjprq"><span class="dot svelte-cjprq"></span> <span class="lg-label svelte-cjprq"> </span> <span class="lg-pct svelte-cjprq"> </span></li>`);
var root_10$3 = from_html(`<div class="donut-wrap svelte-cjprq"><svg class="donut svelte-cjprq" viewBox="0 0 42 42" role="img" aria-label="Status-Verteilung"><circle class="donut-bg svelte-cjprq" cx="21" cy="21" r="15.915"></circle><!></svg> <ul class="legend svelte-cjprq"></ul></div>`);
var root_11$3 = from_html(`<div class="donut-wrap svelte-cjprq"><svg class="donut svelte-cjprq" viewBox="0 0 42 42" role="img" aria-label="Format-Verteilung"><circle class="donut-bg svelte-cjprq" cx="21" cy="21" r="15.915"></circle><!></svg> <ul class="legend svelte-cjprq"></ul></div>`);
var root_12$2 = from_svg(`<circle class="line-pt svelte-cjprq" r="3"><title> </title></circle>`);
var root_13$2 = from_html(`<span class="svelte-cjprq"> </span>`);
var root_14$2 = from_html(`<div class="line-wrap svelte-cjprq"><svg preserveAspectRatio="none" class="line svelte-cjprq" role="img" aria-label="Erscheinungsjahre"><polygon class="line-area svelte-cjprq"></polygon><polyline class="line-stroke svelte-cjprq"></polyline><!></svg> <div class="line-x svelte-cjprq"></div></div>`);
var root_15$2 = from_html(`<div class="tiles svelte-cjprq"><div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Titel gesamt</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Folgen gesehen</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Tage geschaut</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Tage geplant</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Ø Wertung</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Std-Abweichung</span></div></div> <section class="block svelte-cjprq"><div class="bhead svelte-cjprq"><h2 class="svelte-cjprq">Wertungen</h2> <div class="toggle svelte-cjprq"><button>Titel</button> <button>Stunden</button></div></div> <div class="chart svelte-cjprq"></div></section> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Folgen-Umfang</h2> <!></section> <div class="duo svelte-cjprq"><section class="block svelte-cjprq"><h2 class="svelte-cjprq">Status-Verteilung</h2> <!></section> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Format-Verteilung</h2> <!></section></div> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Erscheinungsjahre</h2> <!></section>`, 1);
var root_16$1 = from_html(`<div class="empty svelte-cjprq"> </div>`);
var root_17$1 = from_html(`<div class="gcard svelte-cjprq"><div class="gtop svelte-cjprq"><span class="rank svelte-cjprq"></span> <span class="gname svelte-cjprq"> </span></div> <div class="gstats svelte-cjprq"><div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Anzahl</span></div> <div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Ø Wertung</span></div> <div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Std</span></div></div> <div class="gbar svelte-cjprq"><div class="gbar-fill svelte-cjprq"></div></div> <div class="gfoot svelte-cjprq"> </div></div>`);
var root_18$1 = from_html(`<div class="grid svelte-cjprq"></div>`);
var root_19$1 = from_html(`<div class="bhead card-head svelte-cjprq"><h2 class="svelte-cjprq"> </h2> <div class="toggle svelte-cjprq"></div></div> <!>`, 1);
var root_20 = from_html(`<!> <div class="stats svelte-cjprq"><aside class="side svelte-cjprq"><div class="side-head svelte-cjprq">Anime-Statistik</div> <!> <!></aside> <section class="content svelte-cjprq"><!></section></div>`, 1);

const $$css$6 = {
	hash: 'svelte-cjprq',
	code: '.profile-head.svelte-cjprq {max-width:var(--maxw);margin:0 auto;padding:28px 20px 0;display:flex;align-items:center;gap:16px;}.pavatar.svelte-cjprq {width:64px;height:64px;border-radius:var(--radius);background:linear-gradient(135deg, var(--accent), var(--accent-dim));display:grid;place-items:center;font-weight:800;font-size:1.3rem;color:var(--on-accent);}.pmeta.svelte-cjprq h1:where(.svelte-cjprq) {margin:0;font-size:1.4rem;font-weight:600;color:var(--text-strong);}.pmeta.svelte-cjprq p:where(.svelte-cjprq) {margin:2px 0 0;color:var(--text-muted);font-size:0.85rem;}.stats.svelte-cjprq {max-width:var(--maxw);margin:0 auto;padding:24px 20px 60px;display:grid;grid-template-columns:220px 1fr;gap:30px;}\n\n  /* Sidebar — AniList Stats-Seitennav */.side.svelte-cjprq {display:flex;flex-direction:column;gap:2px;position:sticky;top:90px;align-self:start;}.side-head.svelte-cjprq {font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);font-weight:700;padding:4px 14px 8px;}.side.svelte-cjprq button:where(.svelte-cjprq) {text-align:left;padding:10px 14px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-weight:600;font-size:0.86rem;transition:background 0.15s, color 0.15s;}.side.svelte-cjprq button:where(.svelte-cjprq):hover:not(:disabled) {color:var(--text);background:var(--surface-2);}.side.svelte-cjprq button.on:where(.svelte-cjprq) {background:var(--accent);color:var(--on-accent);}.side.svelte-cjprq button.locked:where(.svelte-cjprq) {display:flex;align-items:center;justify-content:space-between;opacity:0.45;cursor:not-allowed;}.side.svelte-cjprq button.locked:where(.svelte-cjprq) .lock:where(.svelte-cjprq) {font-size:0.78rem;}.content.svelte-cjprq {min-width:0;}.loading.svelte-cjprq, .empty.svelte-cjprq {text-align:center;color:var(--text-muted);padding:50px;background:var(--surface);border-radius:var(--radius);}.empty.inline.svelte-cjprq {padding:24px;background:transparent;}\n\n  /* Stat-Tiles */.tiles.svelte-cjprq {display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:16px;margin-bottom:24px;}.tile.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:20px 16px;display:flex;flex-direction:column;gap:6px;box-shadow:var(--shadow-sm);}.tile.svelte-cjprq .n:where(.svelte-cjprq) {font-size:2rem;font-weight:700;color:var(--accent);line-height:1;}.tile.svelte-cjprq .l:where(.svelte-cjprq) {font-size:0.78rem;color:var(--text-muted);}\n\n  /* Karten-Blöcke */.block.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:22px 24px;margin-bottom:24px;box-shadow:var(--shadow-sm);}.bhead.svelte-cjprq {display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;}.card-head.svelte-cjprq {margin-bottom:20px;}h2.svelte-cjprq {font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:600;margin:0 0 18px;}.bhead.svelte-cjprq h2:where(.svelte-cjprq) {margin:0;}\n\n  /* Flache Segment-Toggles */.toggle.svelte-cjprq {display:inline-flex;gap:2px;background:var(--surface-2);border-radius:var(--radius);padding:2px;}.toggle.svelte-cjprq button:where(.svelte-cjprq) {padding:6px 13px;border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.78rem;font-weight:600;border-radius:var(--radius-sm);transition:background 0.15s, color 0.15s;}.toggle.svelte-cjprq button:where(.svelte-cjprq):hover {color:var(--text);}.toggle.svelte-cjprq button.on:where(.svelte-cjprq) {background:var(--accent);color:var(--on-accent);}\n\n  /* Säulendiagramm Wertungen */.chart.svelte-cjprq {display:flex;align-items:flex-end;gap:10px;height:170px;}.col.svelte-cjprq {flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:8px;}.colbar.svelte-cjprq {width:100%;min-height:3px;background:var(--accent);border-radius:var(--radius) var(--radius) 0 0;transition:height 0.3s;}.col.svelte-cjprq span:where(.svelte-cjprq) {font-size:0.72rem;color:var(--text-muted);}\n\n  /* Balken */.bars.svelte-cjprq {display:flex;flex-direction:column;gap:10px;}.bar.svelte-cjprq {display:grid;grid-template-columns:160px 1fr 64px;align-items:center;gap:12px;font-size:0.82rem;}.bl.svelte-cjprq {color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.track.svelte-cjprq {background:var(--surface-2);border-radius:var(--radius);height:8px;overflow:hidden;}.fill.svelte-cjprq {height:100%;background:var(--accent);border-radius:var(--radius);transition:width 0.3s;}.bc.svelte-cjprq {text-align:right;color:var(--text-strong);font-weight:600;}\n\n  /* Donuts */.duo.svelte-cjprq {display:grid;grid-template-columns:1fr 1fr;gap:24px;}.duo.svelte-cjprq .block:where(.svelte-cjprq) {margin-bottom:24px;}.donut-wrap.svelte-cjprq {display:flex;align-items:center;gap:22px;}.donut.svelte-cjprq {width:128px;height:128px;flex:0 0 auto;transform:rotate(-90deg);}.donut-bg.svelte-cjprq {fill:none;stroke:var(--surface-2);stroke-width:4;}.donut-seg.svelte-cjprq {fill:none;stroke-width:4;transition:stroke-dasharray 0.3s;}.legend.svelte-cjprq {list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;min-width:0;flex:1;}.legend.svelte-cjprq li:where(.svelte-cjprq) {display:flex;align-items:center;gap:8px;font-size:0.8rem;}.dot.svelte-cjprq {width:11px;height:11px;border-radius:3px;flex:0 0 auto;}.lg-label.svelte-cjprq {color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}.lg-pct.svelte-cjprq {color:var(--text-strong);font-weight:600;margin-left:auto;}\n\n  /* Linie */.line-wrap.svelte-cjprq {position:relative;}.line.svelte-cjprq {width:100%;height:160px;display:block;overflow:visible;}.line-area.svelte-cjprq {fill:color-mix(in srgb, var(--accent) 14%, transparent);stroke:none;}.line-stroke.svelte-cjprq {fill:none;stroke:var(--accent);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round;}.line-pt.svelte-cjprq {fill:var(--surface);stroke:var(--accent);stroke-width:2;}.line-x.svelte-cjprq {position:relative;height:16px;margin-top:4px;}.line-x.svelte-cjprq span:where(.svelte-cjprq) {position:absolute;transform:translateX(-50%);font-size:0.68rem;color:var(--text-muted);white-space:nowrap;}\n\n  /* Genres/Tags Karten-Grid */.grid.svelte-cjprq {display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;}.gcard.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:12px;}.gtop.svelte-cjprq {display:flex;align-items:baseline;gap:8px;}.rank.svelte-cjprq {color:var(--accent);font-weight:700;font-size:0.9rem;flex:0 0 auto;}.gname.svelte-cjprq {color:var(--text-strong);font-weight:600;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.gstats.svelte-cjprq {display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;}.gstat.svelte-cjprq {display:flex;flex-direction:column;gap:2px;}.gv.svelte-cjprq {color:var(--text-strong);font-weight:700;font-size:0.95rem;}.gl.svelte-cjprq {color:var(--text-muted);font-size:0.68rem;}.gbar.svelte-cjprq {background:var(--surface-2);border-radius:var(--radius);height:6px;overflow:hidden;}.gbar-fill.svelte-cjprq {height:100%;background:var(--accent);border-radius:var(--radius);transition:width 0.3s;}.gfoot.svelte-cjprq {font-size:0.72rem;color:var(--text-muted);text-align:right;}\n\n  @media (max-width: 860px) {.duo.svelte-cjprq {grid-template-columns:1fr;}.grid.svelte-cjprq {grid-template-columns:repeat(2, 1fr);}\n  }\n  @media (max-width: 680px) {.stats.svelte-cjprq {grid-template-columns:1fr;gap:20px;}.side.svelte-cjprq {flex-direction:row;flex-wrap:wrap;position:static;gap:4px;}.side-head.svelte-cjprq {width:100%;padding:0 4px 2px;}.grid.svelte-cjprq {grid-template-columns:1fr;}.bar.svelte-cjprq {grid-template-columns:110px 1fr 54px;}.donut-wrap.svelte-cjprq {flex-direction:column;align-items:flex-start;}\n  }'
};

function Stats($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$6);

	let api$1 = prop($$props, 'api', 3, api);
	let page = state('overview');
	let stats = state(null);
	let uname = state('');

	api$1().anilistUsername().then((d) => {
		if (d?.username) set(uname, d.username, true);
	}).catch(() => {});

	let dist = state(null);
	let genres = state(proxy([]));
	let tags = state(proxy([]));
	let studios = state(proxy([]));
	let scoreMode = state('count');
	let rankBy = state('count');

	user_effect(() => {
		api$1().profileStats().then((s) => set(stats, s, true)).catch(() => {});
	});

	user_effect(() => {
		api$1().statsDistributions().then((d) => set(dist, d, true)).catch(() => {});
	});

	user_effect(() => {
		if (get(page) === 'genres' && !get(genres).length) api$1().statsGenres().then((d) => set(genres, d.items, true)).catch(() => {});
		if (get(page) === 'studios' && !get(studios).length) api$1().statsStudios().then((d) => set(studios, d.items, true)).catch(() => {});
		if (get(page) === 'tags' && !get(tags).length) api$1().statsTags().then((d) => set(tags, d.items, true)).catch(() => {});
	});

	// Sidebar: aktive Punkte + deaktivierte 🔒 (brauchen zusätzlichen Sync)
	const SIDE = [
		{ id: 'overview', label: 'Übersicht' },
		{ id: 'genres', label: 'Genres' },
		{ id: 'tags', label: 'Tags' },
		{ id: 'studios', label: 'Studios' }
	];

	const SIDE_LOCKED = ['Voice Actors', 'Staff'];

	const RANK = [
		['count', 'Anzahl'],
		['mean_score', 'Ø Wertung'],
		['hours', 'Stunden']
	];

	const FORMAT = {
		TV: 'Fernseher',
		TV_SHORT: 'TV-Kurzfilm',
		MOVIE: 'Film',
		SPECIAL: 'Spezial',
		OVA: 'OVA',
		ONA: 'ONA',
		MUSIC: 'Musik'
	};

	const STATUS = {
		watching: 'Beobachten',
		rewatching: 'Wiederanschauen',
		completed: 'Abgeschlossen',
		paused: 'Pausiert',
		dropped: 'Fallen Gelassen',
		planning: 'Planung'
	};

	const nf = new Intl.NumberFormat('de-DE');
	const num = (n) => nf.format(n);

	// ── Score-Chart ──────────────────────────────────────────────
	let scoreData = user_derived(() => {
		const src = get(scoreMode) === 'count'
			? get(stats)?.score_dist ?? {}
			: get(stats)?.hours_by_score ?? {};

		return Array.from({ length: 10 }, (_, i) => ({ s: i + 1, v: src[String(i + 1)] ?? 0 }));
	});

	let maxScore = user_derived(() => Math.max(1, ...get(scoreData).map((d) => d.v)));

	// ── Folgen-Umfang ────────────────────────────────────────────
	let epi = user_derived(() => Object.entries(get(stats)?.episode_dist ?? {}));

	let maxEpi = user_derived(() => Math.max(1, ...get(epi).map(([, v]) => v)));

	// ── Donut-Helfer ─────────────────────────────────────────────
	// Akzent-getriebene Schattierungen (bleiben theme-aware über Tokens)
	const SHADES = [85, 68, 52, 38, 26, 16];

	function shade(i) {
		const p = SHADES[i % SHADES.length];

		return `color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`;
	}

	function toDonut(raw, labelMap) {
		const items = (raw ?? []).map((r) => ({ key: String(r.key), count: Number(r.count) || 0 })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
		const total = items.reduce((s, r) => s + r.count, 0) || 1;
		const C = 100; // Umfang in SVG-Einheiten (r so gewählt)
		let acc = 0;

		return items.map((r, i) => {
			const pct = r.count / total * 100;
			const dash = r.count / total * C;

			const seg = {
				label: labelMap?.[r.key] ?? r.key,
				count: r.count,
				pct,
				color: shade(i),
				dash,
				offset: -acc
			};

			acc += dash;

			return seg;
		});
	}

	let statusDonut = user_derived(() => toDonut(get(dist)?.by_status, STATUS));
	let formatDonut = user_derived(() => toDonut(get(dist)?.by_format, FORMAT));

	// ── Release-Year-Linie ───────────────────────────────────────
	let years = user_derived(() => {
		const raw = (get(dist)?.by_year ?? []).map((r) => ({ year: Number(r.key), count: Number(r.count) || 0 })).filter((r) => Number.isFinite(r.year)).sort((a, b) => a.year - b.year);

		return raw;
	});

	const LW = 600;
	const LH = 160;
	const LPX = 8;
	const LPY = 14;
	let yearMax = user_derived(() => Math.max(1, ...get(years).map((y) => y.count)));

	let yearPts = user_derived(() => {
		const n = get(years).length;

		if (!n) return [];

		return get(years).map((y, i) => ({
			x: LPX + (n === 1 ? (LW - 2 * LPX) / 2 : i / (n - 1) * (LW - 2 * LPX)),
			y: LH - LPY - y.count / get(yearMax) * (LH - 2 * LPY),
			year: y.year,
			count: y.count
		}));
	});

	let yearLine = user_derived(() => get(yearPts).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

	let yearArea = user_derived(() => get(yearPts).length
		? `${get(yearPts)[0].x.toFixed(1)},${(LH - LPY).toFixed(1)} ${get(yearLine)} ${get(yearPts)[get(yearPts).length - 1].x.toFixed(1)},${(LH - LPY).toFixed(1)}`
		: '');

	// ── Genres / Tags Karten-Grid ────────────────────────────────
	function ranked(list) {
		return [...list].sort((a, b) => (b[get(rankBy)] ?? 0) - (a[get(rankBy)] ?? 0));
	}

	const rankLabel = (x, k) => k === 'mean_score'
		? x.mean_score != null ? num(x.mean_score) : '–'
		: k === 'hours' ? num(x.hours ?? 0) + ' Std' : num(x.count ?? 0);

	var fragment = root_20();
	var node = first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root$6();
			var div_1 = sibling(child(div), 2);
			var h1 = child(div_1);
			var text = only_child(h1, true);
			var p_1 = sibling(h1, 2);
			var text_1 = only_child(p_1);

			template_effect(() => {
				set_text(text, get(uname) || 'Mein Profil');
				set_text(text_1, `${get(stats).total ?? ''} Titel in der Liste`);
			});

			append($$anchor, div);
		};

		if_block(node, ($$render) => {
			if (get(stats)) $$render(consequent);
		});
	}

	var div_2 = sibling(node, 2);
	var aside = child(div_2);
	var node_1 = sibling(child(aside), 2);

	each(node_1, 17, () => SIDE, index, ($$anchor, $$item) => {
		let id = () => get($$item).id;
		let label = () => get($$item).label;
		var button = root_1$6();
		let classes;
		var text_2 = only_child(button, true);

		template_effect(() => {
			classes = set_class(button, 1, 'svelte-cjprq', null, classes, { on: get(page) === id() });
			set_text(text_2, label());
		});

		delegated('click', button, () => set(page, id(), true));
		append($$anchor, button);
	});

	var node_2 = sibling(node_1, 2);

	each(node_2, 17, () => SIDE_LOCKED, index, ($$anchor, label) => {
		var button_1 = root_2$6();
		var span = child(button_1);
		var text_3 = only_child(span, true);
		template_effect(() => set_text(text_3, get(label)));
		append($$anchor, button_1);
	});

	var section = sibling(aside, 2);
	var node_3 = child(section);

	{
		var consequent_1 = ($$anchor) => {
			var div_3 = root_3$5();

			append($$anchor, div_3);
		};

		var consequent_7 = ($$anchor) => {
			var fragment_1 = root_15$2();
			var div_4 = first_child(fragment_1);
			var div_5 = child(div_4);
			var span_1 = child(div_5);
			var text_4 = only_child(span_1, true);

			var div_6 = sibling(div_5, 2);
			var span_2 = child(div_6);
			var text_5 = only_child(span_2, true);

			var div_7 = sibling(div_6, 2);
			var span_3 = child(div_7);
			var text_6 = only_child(span_3, true);

			var div_8 = sibling(div_7, 2);
			var span_4 = child(div_8);
			var text_7 = only_child(span_4, true);

			var div_9 = sibling(div_8, 2);
			var span_5 = child(div_9);
			var text_8 = only_child(span_5, true);

			var div_10 = sibling(div_9, 2);
			var span_6 = child(div_10);
			var text_9 = only_child(span_6, true);

			var section_1 = sibling(div_4, 2);
			var div_11 = child(section_1);
			var div_12 = sibling(child(div_11), 2);
			var button_2 = child(div_12);
			let classes_1;
			var button_3 = sibling(button_2, 2);
			let classes_2;

			var div_13 = sibling(div_11, 2);

			each(div_13, 21, () => get(scoreData), index, ($$anchor, d) => {
				var div_14 = root_4$5();
				var div_15 = child(div_14);
				var span_7 = sibling(div_15, 2);
				var text_10 = only_child(span_7, true);

				template_effect(
					($0) => {
						set_style(div_15, `height:${get(d).v / get(maxScore) * 100}%`);
						set_attribute(div_15, 'title', `${get(d).s ?? ''}: ${$0 ?? ''}`);
						set_text(text_10, get(d).s);
					},
					[() => num(get(d).v)]
				);

				append($$anchor, div_14);
			});

			var section_2 = sibling(section_1, 2);
			var node_4 = sibling(child(section_2), 2);

			{
				var consequent_2 = ($$anchor) => {
					var div_16 = root_5$4();

					append($$anchor, div_16);
				};

				var alternate = ($$anchor) => {
					var div_17 = root_7$3();

					each(div_17, 21, () => get(epi), index, ($$anchor, $$item) => {
						var $$array = user_derived(() => to_array(get($$item), 2));
						let label = () => get($$array)[0];
						let v = () => get($$array)[1];
						var div_18 = root_6$4();
						var span_8 = child(div_18);
						var text_11 = only_child(span_8, true);
						var div_19 = sibling(span_8, 2);
						var div_20 = only_child(div_19);
						var span_9 = sibling(div_19, 2);
						var text_12 = only_child(span_9, true);

						template_effect(
							($0) => {
								set_text(text_11, label());
								set_style(div_20, `width:${v() / get(maxEpi) * 100}%`);
								set_text(text_12, $0);
							},
							[() => num(v())]
						);

						append($$anchor, div_18);
					});
					append($$anchor, div_17);
				};

				if_block(node_4, ($$render) => {
					if (get(epi).length === 0) $$render(consequent_2); else $$render(alternate, -1);
				});
			}

			var div_21 = sibling(section_2, 2);
			var section_3 = child(div_21);
			var node_5 = sibling(child(section_3), 2);

			{
				var consequent_3 = ($$anchor) => {
					var div_22 = root_5$4();

					append($$anchor, div_22);
				};

				var alternate_1 = ($$anchor) => {
					var div_23 = root_10$3();
					var svg = child(div_23);
					var node_6 = sibling(child(svg));

					each(node_6, 17, () => get(statusDonut), index, ($$anchor, s) => {
						var circle = root_8$3();
						var title = child(circle);
						var text_13 = only_child(title);

						template_effect(
							($0, $1) => {
								set_style(circle, `stroke:${get(s).color ?? ''}`);
								set_attribute(circle, 'stroke-dasharray', `${get(s).dash ?? ''} ${100 - get(s).dash}`);
								set_attribute(circle, 'stroke-dashoffset', get(s).offset);
								set_text(text_13, `${get(s).label ?? ''}: ${$0 ?? ''} (${$1 ?? ''}%)`);
							},
							[
								() => num(get(s).count),
								() => num(Math.round(get(s).pct * 10) / 10)
							]
						);

						append($$anchor, circle);
					});

					var ul = sibling(svg, 2);

					each(ul, 21, () => get(statusDonut), index, ($$anchor, s) => {
						var li = root_9$3();
						var span_10 = child(li);
						var span_11 = sibling(span_10, 2);
						var text_14 = only_child(span_11, true);
						var span_12 = sibling(span_11, 2);
						var text_15 = only_child(span_12);

						template_effect(
							($0) => {
								set_style(span_10, `background:${get(s).color ?? ''}`);
								set_text(text_14, get(s).label);
								set_text(text_15, `${$0 ?? ''}%`);
							},
							[() => num(Math.round(get(s).pct * 10) / 10)]
						);

						append($$anchor, li);
					});
					append($$anchor, div_23);
				};

				if_block(node_5, ($$render) => {
					if (get(statusDonut).length === 0) $$render(consequent_3); else $$render(alternate_1, -1);
				});
			}

			var section_4 = sibling(section_3, 2);
			var node_7 = sibling(child(section_4), 2);

			{
				var consequent_4 = ($$anchor) => {
					var div_24 = root_5$4();

					append($$anchor, div_24);
				};

				var alternate_2 = ($$anchor) => {
					var div_25 = root_11$3();
					var svg_1 = child(div_25);
					var node_8 = sibling(child(svg_1));

					each(node_8, 17, () => get(formatDonut), index, ($$anchor, s) => {
						var circle_1 = root_8$3();
						var title_1 = child(circle_1);
						var text_16 = only_child(title_1);

						template_effect(
							($0, $1) => {
								set_style(circle_1, `stroke:${get(s).color ?? ''}`);
								set_attribute(circle_1, 'stroke-dasharray', `${get(s).dash ?? ''} ${100 - get(s).dash}`);
								set_attribute(circle_1, 'stroke-dashoffset', get(s).offset);
								set_text(text_16, `${get(s).label ?? ''}: ${$0 ?? ''} (${$1 ?? ''}%)`);
							},
							[
								() => num(get(s).count),
								() => num(Math.round(get(s).pct * 10) / 10)
							]
						);

						append($$anchor, circle_1);
					});

					var ul_1 = sibling(svg_1, 2);

					each(ul_1, 21, () => get(formatDonut), index, ($$anchor, s) => {
						var li_1 = root_9$3();
						var span_13 = child(li_1);
						var span_14 = sibling(span_13, 2);
						var text_17 = only_child(span_14, true);
						var span_15 = sibling(span_14, 2);
						var text_18 = only_child(span_15);

						template_effect(
							($0) => {
								set_style(span_13, `background:${get(s).color ?? ''}`);
								set_text(text_17, get(s).label);
								set_text(text_18, `${$0 ?? ''}%`);
							},
							[() => num(Math.round(get(s).pct * 10) / 10)]
						);

						append($$anchor, li_1);
					});
					append($$anchor, div_25);
				};

				if_block(node_7, ($$render) => {
					if (get(formatDonut).length === 0) $$render(consequent_4); else $$render(alternate_2, -1);
				});
			}

			var section_5 = sibling(div_21, 2);
			var node_9 = sibling(child(section_5), 2);

			{
				var consequent_5 = ($$anchor) => {
					var div_26 = root_5$4();

					append($$anchor, div_26);
				};

				var alternate_3 = ($$anchor) => {
					var div_27 = root_14$2();
					var svg_2 = child(div_27);

					set_attribute(svg_2, 'viewBox', '0 0 600 160');

					var polygon = child(svg_2);
					var polyline = sibling(polygon);
					var node_10 = sibling(polyline);

					each(node_10, 17, () => get(yearPts), index, ($$anchor, p) => {
						var circle_2 = root_12$2();
						var title_2 = child(circle_2);
						var text_19 = only_child(title_2);

						template_effect(
							($0) => {
								set_attribute(circle_2, 'cx', get(p).x);
								set_attribute(circle_2, 'cy', get(p).y);
								set_text(text_19, `${get(p).year ?? ''}: ${$0 ?? ''}`);
							},
							[() => num(get(p).count)]
						);

						append($$anchor, circle_2);
					});

					var div_28 = sibling(svg_2, 2);

					each(div_28, 21, () => get(yearPts), index, ($$anchor, p, i) => {
						var fragment_2 = comment();
						var node_11 = first_child(fragment_2);

						{
							var consequent_6 = ($$anchor) => {
								var span_16 = root_13$2();
								var text_20 = only_child(span_16, true);

								template_effect(() => {
									set_style(span_16, `left:${get(p).x / LW * 100}%`);
									set_text(text_20, get(p).year);
								});

								append($$anchor, span_16);
							};

							var d_1 = user_derived(() => get(years).length <= 14 || i === 0 || i === get(yearPts).length - 1 || i % Math.ceil(get(years).length / 10) === 0);

							if_block(node_11, ($$render) => {
								if (get(d_1)) $$render(consequent_6);
							});
						}

						append($$anchor, fragment_2);
					});

					template_effect(() => {
						set_attribute(polygon, 'points', get(yearArea));
						set_attribute(polyline, 'points', get(yearLine));
					});

					append($$anchor, div_27);
				};

				if_block(node_9, ($$render) => {
					if (get(years).length === 0) $$render(consequent_5); else $$render(alternate_3, -1);
				});
			}

			template_effect(
				($0, $1, $2, $3, $4, $5) => {
					set_text(text_4, $0);
					set_text(text_5, $1);
					set_text(text_6, $2);
					set_text(text_7, $3);
					set_text(text_8, $4);
					set_text(text_9, $5);
					classes_1 = set_class(button_2, 1, 'svelte-cjprq', null, classes_1, { on: get(scoreMode) === 'count' });
					classes_2 = set_class(button_3, 1, 'svelte-cjprq', null, classes_2, { on: get(scoreMode) === 'hours' });
				},
				[
					() => num(get(stats).total),
					() => num(get(stats).episodes),
					() => num(get(stats).days_watched),
					() => num(get(stats).days_planned),
					() => get(stats).mean_score != null ? num(get(stats).mean_score) : '–',
					() => get(stats).std_dev != null ? num(get(stats).std_dev) : '–'
				]
			);

			delegated('click', button_2, () => set(scoreMode, 'count'));
			delegated('click', button_3, () => set(scoreMode, 'hours'));
			append($$anchor, fragment_1);
		};

		var alternate_5 = ($$anchor) => {
			const list = user_derived(() => get(page) === 'genres'
				? get(genres)
				: get(page) === 'studios' ? get(studios) : get(tags));

			var fragment_3 = root_19$1();
			var div_29 = first_child(fragment_3);
			var h2 = child(div_29);
			var text_21 = only_child(h2, true);
			var div_30 = sibling(h2, 2);

			each(div_30, 21, () => RANK, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let id = () => get($$array_1)[0];
				let label = () => get($$array_1)[1];
				var button_4 = root_1$6();
				let classes_3;
				var text_22 = only_child(button_4, true);

				template_effect(() => {
					classes_3 = set_class(button_4, 1, 'svelte-cjprq', null, classes_3, { on: get(rankBy) === id() });
					set_text(text_22, label());
				});

				delegated('click', button_4, () => set(rankBy, id(), true));
				append($$anchor, button_4);
			});

			var node_12 = sibling(div_29, 2);

			{
				var consequent_8 = ($$anchor) => {
					var div_31 = root_16$1();
					var text_23 = only_child(div_31, true);

					template_effect(() => set_text(text_23, get(page) === 'tags' || get(page) === 'studios'
						? 'Noch nicht importiert — Einstellungen → Import → „Von AniList importieren“.'
						: 'Noch keine Daten.'));

					append($$anchor, div_31);
				};

				var alternate_4 = ($$anchor) => {
					var div_32 = root_18$1();

					each(div_32, 21, () => ranked(get(list)), index, ($$anchor, x, i) => {
						var div_33 = root_17$1();
						var div_34 = child(div_33);
						var span_17 = child(div_34);

						span_17.textContent = `#${i + 1}`;

						var span_18 = sibling(span_17, 2);
						var text_24 = only_child(span_18, true);

						var div_35 = sibling(div_34, 2);
						var div_36 = child(div_35);
						var span_19 = child(div_36);
						var text_25 = only_child(span_19, true);

						var div_37 = sibling(div_36, 2);
						var span_20 = child(div_37);
						var text_26 = only_child(span_20, true);

						var div_38 = sibling(div_37, 2);
						var span_21 = child(div_38);
						var text_27 = only_child(span_21, true);

						var div_39 = sibling(div_35, 2);
						var div_40 = only_child(div_39);
						var div_41 = sibling(div_39, 2);
						var text_28 = only_child(div_41, true);

						template_effect(
							($0, $1, $2, $3, $4) => {
								set_attribute(span_18, 'title', get(x).name);
								set_text(text_24, get(x).name);
								set_text(text_25, $0);
								set_text(text_26, $1);
								set_text(text_27, $2);
								set_style(div_40, `width:${$3 ?? ''}%`);
								set_text(text_28, $4);
							},
							[
								() => num(get(x).count ?? 0),
								() => get(x).mean_score != null ? num(get(x).mean_score) : '–',
								() => num(get(x).hours ?? 0),
								() => get(rankBy) === 'mean_score'
									? (get(x).mean_score ?? 0) / 100 * 100
									: (get(x)[get(rankBy)] ?? 0) / Math.max(1, ...get(list).map((y) => y[get(rankBy)] ?? 0)) * 100,
								() => rankLabel(get(x), get(rankBy))
							]
						);

						append($$anchor, div_33);
					});
					append($$anchor, div_32);
				};

				if_block(node_12, ($$render) => {
					if (get(list).length === 0) $$render(consequent_8); else $$render(alternate_4, -1);
				});
			}

			template_effect(() => set_text(text_21, get(page) === 'genres'
				? 'Genres'
				: get(page) === 'studios' ? 'Studios' : 'Tags'));

			append($$anchor, fragment_3);
		};

		if_block(node_3, ($$render) => {
			if (!get(stats)) $$render(consequent_1); else if (get(page) === 'overview') $$render(consequent_7, 1); else $$render(alternate_5, -1);
		});
	}
	append($$anchor, fragment);
	pop();
}

delegate(['click']);

const t = {
  nav: {
    home: "Heim",
    browse: "Entdecken",
    list: "Meine Liste",
    favorites: "Favoriten",
    profile: "Profil"},
  languages: {
    german: "Deutsch",
    english: "Englisch",
    japanese: "Japanisch",
    spanish: "Spanisch",
    french: "Französisch",
    italian: "Italienisch",
    portuguese: "Portug.",
    korean: "Koreanisch",
    chinese: "Chinesisch"
  }
};
const DUB_LANGS = Object.entries(t.languages);

var root$5 = from_html(`<button title="KI-Suche über den Inhalt">KI</button>`);
var root_1$5 = from_html(`<div class="panel-empty svelte-1mrhfs9">Keine Genres</div>`);
var root_2$5 = from_html(`<button><span class="tick svelte-1mrhfs9"> </span> </button>`);
var root_3$4 = from_html(`<div class="panel-empty svelte-1mrhfs9">Tags</div> <!>`, 1);
var root_4$4 = from_html(`<!> <!>`, 1);
var root_5$3 = from_html(`<div class="panel scroll svelte-1mrhfs9"><!></div>`);
var root_6$3 = from_html(`<div class="panel scroll svelte-1mrhfs9"><button><span class="tick svelte-1mrhfs9"> </span>Alle</button> <!></div>`);
var root_7$2 = from_html(`<div class="panel svelte-1mrhfs9"><button><span class="tick svelte-1mrhfs9"> </span>Alle</button> <!></div>`);
var root_8$2 = from_html(`<div class="panel svelte-1mrhfs9"></div>`);
var root_9$2 = from_html(`<div class="state svelte-1mrhfs9">lädt…</div>`);
var root_10$2 = from_html(`<div class="state svelte-1mrhfs9">Nichts gefunden.</div>`);
var root_11$2 = from_html(`<div class="grid svelte-1mrhfs9"></div>`);
var root_12$1 = from_html(`<section class="result svelte-1mrhfs9"><div class="result-head svelte-1mrhfs9"><h2 class="svelte-1mrhfs9">Ergebnisse<!></h2> <button class="all svelte-1mrhfs9">Filter zurücksetzen</button></div> <!></section>`);
var root_13$1 = from_html(`<div class="state svelte-1mrhfs9">Noch nichts zu entdecken — importiere Titel über die Einstellungen.</div>`);
var root_14$1 = from_html(`<section class="row svelte-1mrhfs9"><div class="head svelte-1mrhfs9"><h2 class="svelte-1mrhfs9"> </h2> <button class="all svelte-1mrhfs9">Alle ansehen</button></div> <div class="grid svelte-1mrhfs9"></div></section>`);
var root_15$1 = from_html(`<div class="browse svelte-1mrhfs9"><div class="filterbar svelte-1mrhfs9"><div class="field search svelte-1mrhfs9"><label for="browse-search" class="svelte-1mrhfs9">Suche</label> <div class="searchbox svelte-1mrhfs9"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="svelte-1mrhfs9"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg> <input id="browse-search" type="text" class="svelte-1mrhfs9"/> <!></div></div> <div class="field svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Genres &amp; Tags</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Jahr</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Saison</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Format</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Synchro-Sprache</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Gesehen</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Airing-Status</span> <button class="drop disabled svelte-1mrhfs9" disabled="" title="Noch keine Daten importiert"><span class="val svelte-1mrhfs9">🔒 Alle</span> <i class="arr svelte-1mrhfs9">▾</i></button></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Sortierung</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div></div> <!></div>`);

const $$css$5 = {
	hash: 'svelte-1mrhfs9',
	code: '.browse.svelte-1mrhfs9 {max-width:var(--maxw);margin:0 auto;padding:24px var(--pad) 48px;display:flex;flex-direction:column;gap:34px;}\n\n  /* ---- Filterleiste ---- */.filterbar.svelte-1mrhfs9 {display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px;}.field.svelte-1mrhfs9 {position:relative;display:flex;flex-direction:column;gap:4px;min-width:130px;}.field.narrow.svelte-1mrhfs9 {min-width:110px;}.field.search.svelte-1mrhfs9 {flex:1 1 220px;min-width:180px;}.field.svelte-1mrhfs9 label:where(.svelte-1mrhfs9),\n  .lbl.svelte-1mrhfs9 {font-size:0.72rem;font-weight:600;color:var(--text-muted);padding-left:2px;}.searchbox.svelte-1mrhfs9 {display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0 10px;height:38px;transition:border-color 0.15s ease;}.searchbox.svelte-1mrhfs9:focus-within {border-color:var(--accent);}.searchbox.svelte-1mrhfs9 svg:where(.svelte-1mrhfs9) {width:16px;height:16px;color:var(--text-muted);flex:0 0 auto;}.searchbox.svelte-1mrhfs9 input:where(.svelte-1mrhfs9) {border:0;background:none;outline:none;color:var(--text-strong);font-family:inherit;font-size:0.86rem;width:100%;}.searchbox.svelte-1mrhfs9 input:where(.svelte-1mrhfs9)::placeholder {color:var(--text-muted);}.searchbox.svelte-1mrhfs9 .ki:where(.svelte-1mrhfs9) {flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--radius-sm);padding:3px 9px;font-size:0.74rem;font-weight:700;cursor:pointer;}.searchbox.svelte-1mrhfs9 .ki.on:where(.svelte-1mrhfs9) {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.drop.svelte-1mrhfs9 {display:flex;align-items:center;justify-content:space-between;gap:8px;height:38px;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0 10px;color:var(--text);font-size:0.86rem;cursor:pointer;transition:border-color 0.15s ease, color 0.15s ease;}.drop.svelte-1mrhfs9:hover:not(.disabled) {border-color:var(--accent);}.drop.filled.svelte-1mrhfs9 {color:var(--text-strong);border-color:var(--accent);}.drop.svelte-1mrhfs9 .val:where(.svelte-1mrhfs9) {overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}.drop.svelte-1mrhfs9 .arr:where(.svelte-1mrhfs9) {font-style:normal;font-size:0.7rem;color:var(--text-muted);flex:0 0 auto;}.drop.disabled.svelte-1mrhfs9 {cursor:not-allowed;opacity:0.55;}.panel.svelte-1mrhfs9 {position:absolute;top:calc(100% + 4px);left:0;min-width:100%;max-width:260px;z-index:30;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:4px;display:flex;flex-direction:column;gap:1px;}.panel.scroll.svelte-1mrhfs9 {max-height:280px;overflow-y:auto;}.panel-empty.svelte-1mrhfs9 {padding:8px 10px;font-size:0.8rem;color:var(--text-muted);}.opt.svelte-1mrhfs9 {display:flex;align-items:center;gap:6px;border:0;background:none;color:var(--text);font-size:0.84rem;text-align:left;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;white-space:nowrap;transition:background 0.12s ease, color 0.12s ease;}.opt.svelte-1mrhfs9:hover {background:var(--surface-2);}.opt.sel.svelte-1mrhfs9 {color:var(--accent);font-weight:600;}.opt.svelte-1mrhfs9 .tick:where(.svelte-1mrhfs9) {width:12px;flex:0 0 auto;color:var(--accent);font-size:0.78rem;}\n\n  /* ---- Reihen / Raster ---- */.row.svelte-1mrhfs9,\n  .result.svelte-1mrhfs9 {display:flex;flex-direction:column;gap:14px;}.head.svelte-1mrhfs9,\n  .result-head.svelte-1mrhfs9 {display:flex;align-items:baseline;justify-content:space-between;gap:12px;}.head.svelte-1mrhfs9 h2:where(.svelte-1mrhfs9),\n  .result-head.svelte-1mrhfs9 h2:where(.svelte-1mrhfs9) {margin:0;font-size:0.82rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-strong);}.all.svelte-1mrhfs9 {border:0;background:none;color:var(--text-muted);font-size:0.78rem;cursor:pointer;padding:0;transition:color 0.15s ease;}.all.svelte-1mrhfs9:hover {color:var(--accent);}.grid.svelte-1mrhfs9 {display:grid;grid-template-columns:repeat(6, 1fr);gap:20px 22px;}.state.svelte-1mrhfs9 {padding:48px 0;text-align:center;color:var(--text-muted);font-size:0.9rem;}\n\n  @media (max-width: 980px) {.browse.svelte-1mrhfs9 {padding:20px 24px 40px;}.grid.svelte-1mrhfs9 {grid-template-columns:repeat(4, 1fr);}\n  }\n  @media (max-width: 640px) {.grid.svelte-1mrhfs9 {grid-template-columns:repeat(3, 1fr);gap:16px 14px;}.field.search.svelte-1mrhfs9 {flex-basis:100%;}\n  }'
};

function Browse($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$5);

	user_effect(() => {
		if (!aiState.loaded) refreshAi();
	});

	// Props: spec = { api, activeType, hToken, onopen }.
	// App.svelte reicht aktuell mediaType/space/onViewAll einzeln durch (App NICHT editierbar),
	// darum beide Formen akzeptieren und daraus ableiten — Build bleibt sauber.
	let activeType = prop($$props, 'activeType', 3, undefined),
		mediaType = prop($$props, 'mediaType', 3, undefined),
		space = prop($$props, 'space', 3, undefined),
		hToken = prop($$props, 'hToken', 3, null),
		onViewAll = prop($$props, 'onViewAll', 3, undefined);

	const mt = user_derived(() => activeType()?.media_type ?? mediaType() ?? 'anime');
	const sp = user_derived(() => activeType()?.space ?? space() ?? 'normal');

	// ---- deutsche Labels -------------------------------------------------
	const FORMAT_DE = {
		TV: 'Fernseher',
		TV_SHORT: 'TV-Kurzfilm',
		MOVIE: 'Film',
		SPECIAL: 'Spezial',
		OVA: 'OVA',
		ONA: 'ONA',
		MUSIC: 'Musik'
	};

	const fmtLabel = (k) => FORMAT_DE[k] ?? k;

	const SORTS = [
		{ key: 'popularity', label: 'Beliebtheit' },
		{ key: 'score', label: 'Wertung' },
		{ key: 'title', label: 'Titel' },
		{ key: 'recent', label: 'Zuletzt hinzugefügt' }
	];

	const sortLabel = (k) => SORTS.find((s) => s.key === k)?.label ?? k;

	// ---- Entdecken-Reihen ------------------------------------------------
	const DEFS = [
		{
			key: 'trending',
			title: 'Trending Now',
			sort: 'popularity',
			limit: 6
		},
		{ key: 'popular', title: 'Beliebt', sort: 'score', limit: 6 },
		{
			key: 'recent',
			title: 'Zuletzt hinzugefügt',
			sort: 'recent',
			limit: 6
		},
		{ key: 'top', title: 'Top 100', sort: 'score', limit: 24 }
	];

	let rows = state(proxy([]));
	let rowsLoading = state(false);

	// ---- Filter-Metadaten (Genres/Formate/Jahre pro Config) --------------
	let meta = state(proxy({
		genres: [],
		tags: [],
		formats: [],
		year_min: 1960,
		year_max: new Date().getFullYear() + 1
	}));

	// ---- Filterzustand ---------------------------------------------------
	let search = state('');

	let ai = state(false // KI-/Semantik-Suche
	);
	let selGenres = state(proxy([]));
	let selTags = state(proxy([]));
	let selSeason = state('');
	let selYear = state('');
	let selFormat = state('');
	let selDubLang = state('');
	let selSeen = state('');
	let selSort = state('popularity');
	let forceGrid = state(false);
	let openDrop = state('');

	const SEENS = [
		{ key: '', label: 'Alle' },
		{ key: 'yes', label: 'Gesehen' },
		{ key: 'no', label: 'Nicht gesehen' }
	];

	const seenLabel = (k) => SEENS.find((s) => s.key === k)?.label ?? 'Alle';
	const active = user_derived(() => !!(get(search).trim() || get(selGenres).length || get(selTags).length || get(selSeason) || get(selYear) || get(selFormat) || get(selDubLang) || get(selSeen) || get(forceGrid)));

	const years = user_derived(() => {
		const out = [];

		for (let y = get(meta).year_max; y >= get(meta).year_min; y--) out.push(y);

		return out;
	});

	// ---- Datenschicht ----------------------------------------------------
	async function fetchList(q) {
		const base = { media_type: get(mt), ...q };

		if (get(sp) === 'h') {
			if (!hToken()) return { total: 0, items: [] };

			const d = await $$props.api.h(hToken(), base);

			return { total: d?.total ?? 0, items: d?.items ?? [] };
		}

		const d = await $$props.api.anime(base);

		return { total: d?.total ?? 0, items: d?.items ?? [] };
	}

	async function loadMeta() {
		try {
			const m = await $$props.api.metaFilters({ space: get(sp), media_type: get(mt) }, hToken());

			set(
				meta,
				{
					genres: m?.genres ?? [],
					tags: m?.tags ?? [],
					formats: m?.formats ?? [],
					year_min: m?.year_min ?? 1960,
					year_max: m?.year_max ?? new Date().getFullYear() + 1
				},
				true
			);
		} catch(e) {
			console.error('Browse metaFilters failed:', e);
		}
	}

	async function loadRows() {
		set(rowsLoading, true);

		try {
			const results = await Promise.all(DEFS.map(async (def) => {
				try {
					const { items } = await fetchList({ sort: def.sort, limit: def.limit });

					if (!items.length) return null;

					return { ...def, items };
				} catch(e) {
					console.error('Browse row failed:', def.key, e);

					return null;
				}
			}));

			set(rows, results.filter((r) => r !== null), true);
		} finally {
			set(rowsLoading, false);
		}
	}

	// ---- Ergebnis-Raster -------------------------------------------------
	let gridItems = state(proxy([]));

	let gridTotal = state(0);
	let gridLoading = state(false);
	let gridReq = 0;

	async function loadGrid() {
		const req = ++gridReq;

		set(gridLoading, true);

		try {
			const q = { sort: get(selSort), limit: 60 };

			if (get(selGenres).length) q.genres = get(selGenres).join(',');
			if (get(selTags).length) q.tags = get(selTags).join(',');
			if (get(selSeason)) q.season = get(selSeason);

			if (get(selYear)) {
				q.year_min = get(selYear);
				q.year_max = get(selYear);
			}

			if (get(selFormat)) q.format = get(selFormat);
			if (get(selDubLang)) q.dub_lang = get(selDubLang);
			if (get(selSeen)) q.seen = get(selSeen);

			let total, items;

			if (get(ai) && get(search).trim()) {
				// KI-Suche GLEICHZEITIG mit den Filtern
				const tok = get(sp) === 'h' ? hToken() : null;

				const d = await $$props.api.aiSearch(
					{
						q: get(search).trim(),
						space: get(sp),
						media_type: get(mt),
						...q,
						limit: 40
					},
					tok
				);

				items = d?.results ?? [];
				total = items.length;
			} else {
				if (get(search).trim()) q.q = get(search).trim();

				({ total, items } = await fetchList(q));
			}

			if (req !== gridReq) return;

			set(gridItems, items, true);
			set(gridTotal, total, true);
		} catch(e) {
			if (req !== gridReq) return;

			console.error('Browse grid failed:', e);
			set(gridItems, [], true);
			set(gridTotal, 0);
		} finally {
			if (req === gridReq) set(gridLoading, false);
		}
	}

	// ---- Effekte ---------------------------------------------------------
	user_effect(() => {
		// Config-Wechsel → Reihen + Meta neu laden, Filter zurücksetzen
		void get(mt);

		void get(sp);
		void hToken();
		set(search, '');
		set(ai, false);
		set(selGenres, [], true);
		set(selTags, [], true);
		set(selSeason, '');
		set(selYear, '');
		set(selFormat, '');
		set(selDubLang, '');
		set(selSeen, '');
		set(selSort, 'popularity');
		set(forceGrid, false);
		loadMeta();
		loadRows();
	});

	user_effect(() => {
		// Reagiert auf jede Filteränderung
		void get(search);

		void get(ai);
		void get(selGenres);
		void get(selTags);
		void get(selSeason);
		void get(selYear);
		void get(selFormat);
		void get(selDubLang);
		void get(selSeen);
		void get(selSort);
		void get(forceGrid);
		void get(mt);
		void get(sp);

		if (get(active)) loadGrid();
	});

	// ---- Aktionen --------------------------------------------------------
	function toggleTag(t) {
		set(
			selTags,
			get(selTags).includes(t)
				? get(selTags).filter((x) => x !== t)
				: [...get(selTags), t],
			true
		);
	}

	const SEASONS = [
		['WINTER', 'Winter'],
		['SPRING', 'Frühling'],
		['SUMMER', 'Sommer'],
		['FALL', 'Herbst']
	];

	function toggleGenre(g) {
		set(
			selGenres,
			get(selGenres).includes(g)
				? get(selGenres).filter((x) => x !== g)
				: [...get(selGenres), g],
			true
		);
	}

	function viewAll(sort) {
		if (onViewAll()) {
			onViewAll()(sort);
		} else {
			set(selSort, sort, true);
			set(forceGrid, true);
		}
	}

	function clearAll() {
		set(search, '');
		set(ai, false);
		set(selGenres, [], true);
		set(selTags, [], true);
		set(selSeason, '');
		set(selYear, '');
		set(selFormat, '');
		set(selDubLang, '');
		set(selSeen, '');
		set(selSort, 'popularity');
		set(forceGrid, false);
		set(openDrop, '');
	}

	function toggle(id, e) {
		e.stopPropagation();
		set(openDrop, get(openDrop) === id ? '' : id, true);
	}

	function stop(e) {
		e.stopPropagation();
	}

	var div = root_15$1();

	event('click', $window, () => set(openDrop, ''));

	var div_1 = child(div);
	var div_2 = child(div_1);
	var div_3 = sibling(child(div_2), 2);
	var input = sibling(child(div_3), 2);

	var node = sibling(input, 2);

	{
		var consequent = ($$anchor) => {
			var button = root$5();
			let classes;

			template_effect(() => classes = set_class(button, 1, 'ki svelte-1mrhfs9', null, classes, { on: get(ai) }));

			delegated('click', button, (e) => {
				stop(e);
				set(ai, !get(ai));
			});

			append($$anchor, button);
		};

		if_block(node, ($$render) => {
			if (aiState.enabled) $$render(consequent);
		});
	}

	var div_4 = sibling(div_2, 2);
	var button_1 = sibling(child(div_4), 2);
	let classes_1;
	var span = child(button_1);
	var text$1 = only_child(span, true);

	var node_1 = sibling(button_1, 2);

	{
		var consequent_3 = ($$anchor) => {
			var div_5 = root_5$3();
			var node_2 = child(div_5);

			{
				var consequent_1 = ($$anchor) => {
					var div_6 = root_1$5();

					append($$anchor, div_6);
				};

				var alternate = ($$anchor) => {
					var fragment = root_4$4();
					var node_3 = first_child(fragment);

					each(node_3, 17, () => get(meta).genres, index, ($$anchor, g) => {
						var button_2 = root_2$5();
						let classes_2;
						var span_1 = child(button_2);
						var text_1 = only_child(span_1, true);
						var text_2 = sibling(span_1, 1, true);

						template_effect(
							($0, $1) => {
								classes_2 = set_class(button_2, 1, 'opt svelte-1mrhfs9', null, classes_2, { sel: $0 });
								set_text(text_1, $1);
								set_text(text_2, get(g));
							},
							[
								() => get(selGenres).includes(get(g)),
								() => get(selGenres).includes(get(g)) ? '✓' : ''
							]
						);

						delegated('click', button_2, (e) => {
							stop(e);
							toggleGenre(get(g));
						});

						append($$anchor, button_2);
					});

					var node_4 = sibling(node_3, 2);

					{
						var consequent_2 = ($$anchor) => {
							var fragment_1 = root_3$4();
							var node_5 = sibling(first_child(fragment_1), 2);

							each(node_5, 17, () => get(meta).tags, index, ($$anchor, t) => {
								var button_3 = root_2$5();
								let classes_3;
								var span_2 = child(button_3);
								var text_3 = only_child(span_2, true);
								var text_4 = sibling(span_2, 1, true);

								template_effect(
									($0, $1) => {
										classes_3 = set_class(button_3, 1, 'opt svelte-1mrhfs9', null, classes_3, { sel: $0 });
										set_text(text_3, $1);
										set_text(text_4, get(t));
									},
									[
										() => get(selTags).includes(get(t)),
										() => get(selTags).includes(get(t)) ? '✓' : ''
									]
								);

								delegated('click', button_3, (e) => {
									stop(e);
									toggleTag(get(t));
								});

								append($$anchor, button_3);
							});

							append($$anchor, fragment_1);
						};

						if_block(node_4, ($$render) => {
							if (get(meta).tags.length) $$render(consequent_2);
						});
					}

					append($$anchor, fragment);
				};

				if_block(node_2, ($$render) => {
					if (!get(meta).genres.length) $$render(consequent_1); else $$render(alternate, -1);
				});
			}
			append($$anchor, div_5);
		};

		if_block(node_1, ($$render) => {
			if (get(openDrop) === 'genres') $$render(consequent_3);
		});
	}

	var div_7 = sibling(div_4, 2);
	var button_4 = sibling(child(div_7), 2);
	let classes_4;
	var span_3 = child(button_4);
	var text_5 = only_child(span_3, true);

	var node_6 = sibling(button_4, 2);

	{
		var consequent_4 = ($$anchor) => {
			var div_8 = root_6$3();
			var button_5 = child(div_8);
			let classes_5;
			var span_4 = child(button_5);
			var text_6 = only_child(span_4, true);

			var node_7 = sibling(button_5, 2);

			each(node_7, 17, () => get(years), index, ($$anchor, y) => {
				var button_6 = root_2$5();
				let classes_6;
				var span_5 = child(button_6);
				var text_7 = only_child(span_5, true);
				var text_8 = sibling(span_5, 1, true);

				template_effect(
					($0, $1) => {
						classes_6 = set_class(button_6, 1, 'opt svelte-1mrhfs9', null, classes_6, { sel: $0 });
						set_text(text_7, $1);
						set_text(text_8, get(y));
					},
					[
						() => get(selYear) === String(get(y)),
						() => get(selYear) === String(get(y)) ? '✓' : ''
					]
				);

				delegated('click', button_6, () => {
					set(selYear, String(get(y)), true);
					set(openDrop, '');
				});

				append($$anchor, button_6);
			});

			template_effect(() => {
				classes_5 = set_class(button_5, 1, 'opt svelte-1mrhfs9', null, classes_5, { sel: !get(selYear) });
				set_text(text_6, !get(selYear) ? '✓' : '');
			});

			delegated('click', button_5, () => {
				set(selYear, '');
				set(openDrop, '');
			});

			append($$anchor, div_8);
		};

		if_block(node_6, ($$render) => {
			if (get(openDrop) === 'year') $$render(consequent_4);
		});
	}

	var div_9 = sibling(div_7, 2);
	var button_7 = sibling(child(div_9), 2);
	let classes_7;
	var span_6 = child(button_7);
	var text_9 = only_child(span_6, true);

	var node_8 = sibling(button_7, 2);

	{
		var consequent_5 = ($$anchor) => {
			var div_10 = root_7$2();
			var button_8 = child(div_10);
			let classes_8;
			var span_7 = child(button_8);
			var text_10 = only_child(span_7, true);

			var node_9 = sibling(button_8, 2);

			each(node_9, 17, () => SEASONS, index, ($$anchor, $$item) => {
				var $$array = user_derived(() => to_array(get($$item), 2));
				let k = () => get($$array)[0];
				let l = () => get($$array)[1];
				var button_9 = root_2$5();
				let classes_9;
				var span_8 = child(button_9);
				var text_11 = only_child(span_8, true);
				var text_12 = sibling(span_8, 1, true);

				template_effect(() => {
					classes_9 = set_class(button_9, 1, 'opt svelte-1mrhfs9', null, classes_9, { sel: get(selSeason) === k() });
					set_text(text_11, get(selSeason) === k() ? '✓' : '');
					set_text(text_12, l());
				});

				delegated('click', button_9, () => {
					set(selSeason, k(), true);
					set(openDrop, '');
				});

				append($$anchor, button_9);
			});

			template_effect(() => {
				classes_8 = set_class(button_8, 1, 'opt svelte-1mrhfs9', null, classes_8, { sel: !get(selSeason) });
				set_text(text_10, !get(selSeason) ? '✓' : '');
			});

			delegated('click', button_8, () => {
				set(selSeason, '');
				set(openDrop, '');
			});

			append($$anchor, div_10);
		};

		if_block(node_8, ($$render) => {
			if (get(openDrop) === 'season') $$render(consequent_5);
		});
	}

	var div_11 = sibling(div_9, 2);
	var button_10 = sibling(child(div_11), 2);
	let classes_10;
	var span_9 = child(button_10);
	var text_13 = only_child(span_9, true);

	var node_10 = sibling(button_10, 2);

	{
		var consequent_6 = ($$anchor) => {
			var div_12 = root_7$2();
			var button_11 = child(div_12);
			let classes_11;
			var span_10 = child(button_11);
			var text_14 = only_child(span_10, true);

			var node_11 = sibling(button_11, 2);

			each(node_11, 17, () => get(meta).formats, index, ($$anchor, f) => {
				var button_12 = root_2$5();
				let classes_12;
				var span_11 = child(button_12);
				var text_15 = only_child(span_11, true);
				var text_16 = sibling(span_11, 1, true);

				template_effect(
					($0) => {
						classes_12 = set_class(button_12, 1, 'opt svelte-1mrhfs9', null, classes_12, { sel: get(selFormat) === get(f) });
						set_text(text_15, get(selFormat) === get(f) ? '✓' : '');
						set_text(text_16, $0);
					},
					[() => fmtLabel(get(f))]
				);

				delegated('click', button_12, () => {
					set(selFormat, get(f), true);
					set(openDrop, '');
				});

				append($$anchor, button_12);
			});

			template_effect(() => {
				classes_11 = set_class(button_11, 1, 'opt svelte-1mrhfs9', null, classes_11, { sel: !get(selFormat) });
				set_text(text_14, !get(selFormat) ? '✓' : '');
			});

			delegated('click', button_11, () => {
				set(selFormat, '');
				set(openDrop, '');
			});

			append($$anchor, div_12);
		};

		if_block(node_10, ($$render) => {
			if (get(openDrop) === 'format') $$render(consequent_6);
		});
	}

	var div_13 = sibling(div_11, 2);
	var button_13 = sibling(child(div_13), 2);
	let classes_13;
	var span_12 = child(button_13);
	var text_17 = only_child(span_12, true);

	var node_12 = sibling(button_13, 2);

	{
		var consequent_7 = ($$anchor) => {
			var div_14 = root_6$3();
			var button_14 = child(div_14);
			let classes_14;
			var span_13 = child(button_14);
			var text_18 = only_child(span_13, true);

			var node_13 = sibling(button_14, 2);

			each(node_13, 17, () => DUB_LANGS, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_1)[0];
				let l = () => get($$array_1)[1];
				var button_15 = root_2$5();
				let classes_15;
				var span_14 = child(button_15);
				var text_19 = only_child(span_14, true);
				var text_20 = sibling(span_14, 1, true);

				template_effect(() => {
					classes_15 = set_class(button_15, 1, 'opt svelte-1mrhfs9', null, classes_15, { sel: get(selDubLang) === v() });
					set_text(text_19, get(selDubLang) === v() ? '✓' : '');
					set_text(text_20, l());
				});

				delegated('click', button_15, () => {
					set(selDubLang, v(), true);
					set(openDrop, '');
				});

				append($$anchor, button_15);
			});

			template_effect(() => {
				classes_14 = set_class(button_14, 1, 'opt svelte-1mrhfs9', null, classes_14, { sel: !get(selDubLang) });
				set_text(text_18, !get(selDubLang) ? '✓' : '');
			});

			delegated('click', button_14, () => {
				set(selDubLang, '');
				set(openDrop, '');
			});

			append($$anchor, div_14);
		};

		if_block(node_12, ($$render) => {
			if (get(openDrop) === 'dublang') $$render(consequent_7);
		});
	}

	var div_15 = sibling(div_13, 2);
	var button_16 = sibling(child(div_15), 2);
	let classes_16;
	var span_15 = child(button_16);
	var text_21 = only_child(span_15, true);

	var node_14 = sibling(button_16, 2);

	{
		var consequent_8 = ($$anchor) => {
			var div_16 = root_8$2();

			each(div_16, 21, () => SEENS, index, ($$anchor, s) => {
				var button_17 = root_2$5();
				let classes_17;
				var span_16 = child(button_17);
				var text_22 = only_child(span_16, true);
				var text_23 = sibling(span_16, 1, true);

				template_effect(() => {
					classes_17 = set_class(button_17, 1, 'opt svelte-1mrhfs9', null, classes_17, { sel: get(selSeen) === get(s).key });
					set_text(text_22, get(selSeen) === get(s).key ? '✓' : '');
					set_text(text_23, get(s).label);
				});

				delegated('click', button_17, () => {
					set(selSeen, get(s).key, true);
					set(openDrop, '');
				});

				append($$anchor, button_17);
			});
			append($$anchor, div_16);
		};

		if_block(node_14, ($$render) => {
			if (get(openDrop) === 'seen') $$render(consequent_8);
		});
	}

	var div_17 = sibling(div_15, 4);
	var button_18 = sibling(child(div_17), 2);
	let classes_18;
	var span_17 = child(button_18);
	var text_24 = only_child(span_17, true);

	var node_15 = sibling(button_18, 2);

	{
		var consequent_9 = ($$anchor) => {
			var div_18 = root_8$2();

			each(div_18, 21, () => SORTS, index, ($$anchor, s) => {
				var button_19 = root_2$5();
				let classes_19;
				var span_18 = child(button_19);
				var text_25 = only_child(span_18, true);
				var text_26 = sibling(span_18, 1, true);

				template_effect(() => {
					classes_19 = set_class(button_19, 1, 'opt svelte-1mrhfs9', null, classes_19, { sel: get(selSort) === get(s).key });
					set_text(text_25, get(selSort) === get(s).key ? '✓' : '');
					set_text(text_26, get(s).label);
				});

				delegated('click', button_19, () => {
					set(selSort, get(s).key, true);
					set(openDrop, '');
				});

				append($$anchor, button_19);
			});
			append($$anchor, div_18);
		};

		if_block(node_15, ($$render) => {
			if (get(openDrop) === 'sort') $$render(consequent_9);
		});
	}

	var node_16 = sibling(div_1, 2);

	{
		var consequent_13 = ($$anchor) => {
			var section = root_12$1();
			var div_19 = child(section);
			var h2 = child(div_19);
			var node_17 = sibling(child(h2));

			{
				var consequent_10 = ($$anchor) => {
					var text_27 = text();

					template_effect(() => set_text(text_27, `· ${get(gridTotal) ?? ''}`));
					append($$anchor, text_27);
				};

				if_block(node_17, ($$render) => {
					if (!get(gridLoading)) $$render(consequent_10);
				});
			}

			var button_20 = sibling(h2, 2);

			var node_18 = sibling(div_19, 2);

			{
				var consequent_11 = ($$anchor) => {
					var div_20 = root_9$2();

					append($$anchor, div_20);
				};

				var consequent_12 = ($$anchor) => {
					var div_21 = root_10$2();

					append($$anchor, div_21);
				};

				var alternate_1 = ($$anchor) => {
					var div_22 = root_11$2();

					each(div_22, 21, () => get(gridItems), (media) => media.id, ($$anchor, media) => {
						Card($$anchor, {
							get media() {
								return get(media);
							},

							get onopen() {
								return $$props.onopen;
							}
						});
					});
					append($$anchor, div_22);
				};

				if_block(node_18, ($$render) => {
					if (get(gridLoading) && get(gridItems).length === 0) $$render(consequent_11); else if (get(gridItems).length === 0) $$render(consequent_12, 1); else $$render(alternate_1, -1);
				});
			}
			delegated('click', button_20, clearAll);
			append($$anchor, section);
		};

		var alternate_3 = ($$anchor) => {
			var fragment_4 = comment();
			var node_19 = first_child(fragment_4);

			{
				var consequent_14 = ($$anchor) => {
					var div_23 = root_9$2();

					append($$anchor, div_23);
				};

				var consequent_15 = ($$anchor) => {
					var div_24 = root_13$1();

					append($$anchor, div_24);
				};

				var alternate_2 = ($$anchor) => {
					var fragment_5 = comment();
					var node_20 = first_child(fragment_5);

					each(node_20, 17, () => get(rows), (row) => row.key, ($$anchor, row) => {
						var section_1 = root_14$1();
						var div_25 = child(section_1);
						var h2_1 = child(div_25);
						var text_28 = only_child(h2_1, true);
						var button_21 = sibling(h2_1, 2);

						var div_26 = sibling(div_25, 2);

						each(div_26, 21, () => get(row).items, (media) => media.id, ($$anchor, media) => {
							Card($$anchor, {
								get media() {
									return get(media);
								},

								get onopen() {
									return $$props.onopen;
								}
							});
						});
						template_effect(() => set_text(text_28, get(row).title));
						delegated('click', button_21, () => viewAll(get(row).sort));
						append($$anchor, section_1);
					});

					append($$anchor, fragment_5);
				};

				if_block(node_19, ($$render) => {
					if (get(rowsLoading) && get(rows).length === 0) $$render(consequent_14); else if (get(rows).length === 0) $$render(consequent_15, 1); else $$render(alternate_2, -1);
				});
			}

			append($$anchor, fragment_4);
		};

		if_block(node_16, ($$render) => {
			if (get(active)) $$render(consequent_13); else $$render(alternate_3, -1);
		});
	}

	template_effect(
		($0, $1, $2, $3, $4, $5) => {
			set_attribute(input, 'placeholder', get(ai) ? 'KI: Story/Thema…' : 'Titel suchen…');
			classes_1 = set_class(button_1, 1, 'drop svelte-1mrhfs9', null, classes_1, { filled: get(selGenres).length || get(selTags).length });
			set_text(text$1, $0);
			classes_4 = set_class(button_4, 1, 'drop svelte-1mrhfs9', null, classes_4, { filled: get(selYear) });
			set_text(text_5, get(selYear) || 'Alle');
			classes_7 = set_class(button_7, 1, 'drop svelte-1mrhfs9', null, classes_7, { filled: get(selSeason) });
			set_text(text_9, $1);
			classes_10 = set_class(button_10, 1, 'drop svelte-1mrhfs9', null, classes_10, { filled: get(selFormat) });
			set_text(text_13, $2);
			classes_13 = set_class(button_13, 1, 'drop svelte-1mrhfs9', null, classes_13, { filled: get(selDubLang) });
			set_text(text_17, $3);
			classes_16 = set_class(button_16, 1, 'drop svelte-1mrhfs9', null, classes_16, { filled: get(selSeen) });
			set_text(text_21, $4);
			classes_18 = set_class(button_18, 1, 'drop svelte-1mrhfs9', null, classes_18, { filled: get(selSort) !== 'popularity' });
			set_text(text_24, $5);
		},
		[
			() => get(selGenres).length || get(selTags).length
				? [...get(selGenres), ...get(selTags)].join(', ')
				: 'Alle',

			() => get(selSeason)
				? SEASONS.find(([k]) => k === get(selSeason))?.[1]
				: 'Alle',
			() => get(selFormat) ? fmtLabel(get(selFormat)) : 'Alle',
			() => get(selDubLang)
				? DUB_LANGS.find(([v]) => v === get(selDubLang))?.[1] ?? get(selDubLang)
				: 'Alle',
			() => seenLabel(get(selSeen)),
			() => sortLabel(get(selSort))
		]
	);

	delegated('click', input, stop);
	bind_value(input, () => get(search), ($$value) => set(search, $$value));
	delegated('click', button_1, (e) => toggle('genres', e));
	delegated('click', button_4, (e) => toggle('year', e));
	delegated('click', button_7, (e) => toggle('season', e));
	delegated('click', button_10, (e) => toggle('format', e));
	delegated('click', button_13, (e) => toggle('dublang', e));
	delegated('click', button_16, (e) => toggle('seen', e));
	delegated('click', button_18, (e) => toggle('sort', e));
	append($$anchor, div);
	pop();
}

delegate(['click']);

var root$4 = from_html(`<li><button class="feedrow svelte-mqnx2g"><span class="fstatus svelte-mqnx2g"> </span> <span class="ftitle svelte-mqnx2g"> </span></button></li>`);
var root_1$4 = from_html(`<ul class="feed svelte-mqnx2g"></ul>`);
var root_2$4 = from_html(`<p class="empty svelte-mqnx2g">Noch keine Einträge.</p>`);
var root_3$3 = from_html(`<img alt="" loading="lazy" class="svelte-mqnx2g"/>`);
var root_4$3 = from_html(`<div class="ph svelte-mqnx2g"> </div>`);
var root_5$2 = from_html(`<div class="ip svelte-mqnx2g"><button class="ipcover svelte-mqnx2g"><!> <div class="ipfoot svelte-mqnx2g"><span class="prog svelte-mqnx2g"> <!></span></div></button> <button class="plus svelte-mqnx2g" title="Eine Folge weiter">+</button> <div class="iptitle svelte-mqnx2g"> </div></div>`);
var root_6$2 = from_html(`<div class="ipgrid svelte-mqnx2g"></div>`);
var root_7$1 = from_html(`<p class="empty svelte-mqnx2g">Nichts in Bearbeitung.</p>`);
var root_8$1 = from_html(`<div class="cell svelte-mqnx2g"><!></div>`);
var root_9$1 = from_html(`<section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Trending</h2></div> <div class="strip svelte-mqnx2g"></div></section>`);
var root_10$1 = from_html(`<section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Neu hinzugefügt</h2></div> <div class="strip svelte-mqnx2g"></div></section>`);
var root_11$1 = from_html(`<div class="home svelte-mqnx2g"><aside class="left svelte-mqnx2g"><h2 class="svelte-mqnx2g">Aktivität</h2> <div class="locked svelte-mqnx2g"><span class="lockico svelte-mqnx2g">🔒</span> <div><b class="svelte-mqnx2g">Aktivitäts-Feed</b> <p class="svelte-mqnx2g">kommt mit Sync</p></div></div> <h3 class="svelte-mqnx2g">Zuletzt aktualisiert</h3> <!></aside> <div class="right svelte-mqnx2g"><section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">In Bearbeitung</h2></div> <!></section> <section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Demnächst</h2></div> <div class="locked wide svelte-mqnx2g"><span class="lockico svelte-mqnx2g">🔒</span> <div><b class="svelte-mqnx2g">Ausstrahlungs-Countdown</b> <p class="svelte-mqnx2g">kommt mit Sync</p></div></div></section> <!> <!></div></div>`);

const $$css$4 = {
	hash: 'svelte-mqnx2g',
	code: '.home.svelte-mqnx2g {max-width:var(--maxw);margin:0 auto;padding:24px var(--pad) 60px;display:grid;grid-template-columns:300px 1fr;gap:30px;align-items:start;}h2.svelte-mqnx2g {margin:0;font-size:0.85rem;font-weight:600;color:var(--text-muted);}h3.svelte-mqnx2g {margin:22px 0 10px;font-size:0.78rem;font-weight:600;color:var(--text-muted);}\n\n  /* Linke Spalte */.left.svelte-mqnx2g {min-width:0;}.left.svelte-mqnx2g h2:where(.svelte-mqnx2g) {margin-bottom:10px;}.locked.svelte-mqnx2g {display:flex;align-items:center;gap:12px;background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius);padding:16px 18px;color:var(--text-muted);}.locked.wide.svelte-mqnx2g {padding:22px 20px;}.lockico.svelte-mqnx2g {font-size:1.2rem;opacity:0.8;}.locked.svelte-mqnx2g b:where(.svelte-mqnx2g) {color:var(--text);font-size:0.86rem;font-weight:600;}.locked.svelte-mqnx2g p:where(.svelte-mqnx2g) {margin:2px 0 0;font-size:0.76rem;}.feed.svelte-mqnx2g {list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}.feedrow.svelte-mqnx2g {width:100%;display:flex;flex-direction:column;gap:2px;text-align:left;border:0;background:none;color:inherit;cursor:pointer;padding:8px 10px;border-radius:var(--radius);transition:background 0.15s ease;}.feedrow.svelte-mqnx2g:hover {background:var(--surface-2);}.fstatus.svelte-mqnx2g {font-size:0.72rem;font-weight:600;color:var(--accent);}.ftitle.svelte-mqnx2g {font-size:0.84rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.empty.svelte-mqnx2g {color:var(--text-muted);font-size:0.82rem;padding:4px 2px;}\n\n  /* Rechte Spalte */.right.svelte-mqnx2g {min-width:0;display:flex;flex-direction:column;gap:34px;}.block.svelte-mqnx2g {display:flex;flex-direction:column;gap:12px;}.head.svelte-mqnx2g {display:flex;align-items:baseline;justify-content:space-between;gap:12px;}\n\n  /* In-Bearbeitung-Raster mit +1-Button */.ipgrid.svelte-mqnx2g {display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:20px 16px;}.ip.svelte-mqnx2g {display:flex;flex-direction:column;gap:7px;position:relative;min-width:0;}.ipcover.svelte-mqnx2g {position:relative;width:100%;aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;border:0;padding:0;background:var(--surface);box-shadow:var(--shadow-sm);cursor:pointer;transition:transform 0.18s ease, box-shadow 0.18s ease;}.ip.svelte-mqnx2g:hover .ipcover:where(.svelte-mqnx2g) {transform:translateY(-2px);box-shadow:var(--shadow);}.ipcover.svelte-mqnx2g img:where(.svelte-mqnx2g) {width:100%;height:100%;object-fit:cover;display:block;}.ph.svelte-mqnx2g {width:100%;height:100%;display:grid;place-items:center;font-size:2rem;font-weight:600;color:var(--text-muted);}.ipfoot.svelte-mqnx2g {position:absolute;left:0;right:0;bottom:0;padding:5px 7px;background:linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));display:flex;justify-content:flex-start;}.prog.svelte-mqnx2g {font-size:0.72rem;font-weight:600;color:#fff;}.plus.svelte-mqnx2g {position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:var(--radius-sm);border:0;background:var(--accent);color:var(--on-accent);font-size:1.05rem;line-height:1;font-weight:700;cursor:pointer;opacity:0;transition:opacity 0.15s ease, filter 0.15s ease;}.ip.svelte-mqnx2g:hover .plus:where(.svelte-mqnx2g) {opacity:1;}.plus.svelte-mqnx2g:hover {filter:brightness(1.1);}.iptitle.svelte-mqnx2g {font-size:0.8rem;line-height:1.3;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}\n\n  /* Trending / Neu — Cover-Streifen */.strip.svelte-mqnx2g {display:flex;gap:20px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity;scrollbar-width:thin;}.cell.svelte-mqnx2g {flex:0 0 auto;width:140px;scroll-snap-align:start;}\n\n  @media (max-width: 860px) {.home.svelte-mqnx2g {grid-template-columns:1fr;gap:24px;}\n  }\n  @media (max-width: 760px) {.home.svelte-mqnx2g {padding:20px 20px 50px;}.cell.svelte-mqnx2g {width:120px;}\n  }\n  /* Touch-Geräte: +1 immer sichtbar (kein Hover) */\n  @media (hover: none) {.plus.svelte-mqnx2g {opacity:1;}\n  }'
};

function Home($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$4);

	let hToken = prop($$props, 'hToken', 3, null);

	const STATUS_LABEL = {
		watching: 'Beobachten',
		rewatching: 'Wiederanschauen',
		completed: 'Abgeschlossen',
		paused: 'Pausiert',
		dropped: 'Fallen Gelassen',
		planning: 'Planung'
	};

	let activity = state(proxy([]));
	let inProgress = state(proxy([]));
	let trending = state(proxy([]));
	let newlyAdded = state(proxy([]));

	// Config-bewusst: H → api.h(token, …), sonst api.anime; media_type immer mitgeben.
	async function fetchList(q) {
		const base = { ...q, media_type: $$props.activeType.media_type };

		try {
			if ($$props.activeType.space === 'h') {
				if (!hToken()) return [];

				const d = await $$props.api.h(hToken(), base);

				return d?.items ?? [];
			}

			const d = await $$props.api.anime(base);

			return d?.items ?? [];
		} catch(e) {
			console.error('Home fetch failed:', q, e);

			return [];
		}
	}

	async function loadAll() {
		const [act, ip, tr, na] = await Promise.all([
			fetchList({ watch_status: 'all', sort: 'recent', limit: 8 }),
			fetchList({ watch_status: 'watching', sort: 'recent', limit: 12 }),
			fetchList({ sort: 'popularity', limit: 12 }),
			fetchList({ sort: 'recent', limit: 12 })
		]);

		set(activity, act, true);
		set(inProgress, ip, true);
		set(trending, tr, true);
		set(newlyAdded, na, true);
	}

	user_effect(() => {
		// Abhängigkeiten anfassen → Reload bei Config-/Token-Wechsel
		void $$props.activeType.media_type;

		void $$props.activeType.space;
		void hToken();
		loadAll();
	});

	// +1 Folge: lokal hochzählen + ans Backend schicken
	async function bump(m, ev) {
		ev.stopPropagation();

		const next = (m.progress ?? 0) + 1;

		m.progress = next; // $state-Proxy → reaktiv

		try {
			await $$props.api.patchEntry(m.id, { progress: next });
		} catch(e) {
			console.error('patchEntry failed:', m.id, e);
			m.progress = next - 1; // Rollback bei Fehler
		}
	}

	var div = root_11$1();
	var aside = child(div);
	var node = sibling(child(aside), 6);

	{
		var consequent = ($$anchor) => {
			var ul = root_1$4();

			each(ul, 21, () => get(activity), (m) => m.id, ($$anchor, m) => {
				var li = root$4();
				var button = child(li);
				var span = child(button);
				var text = only_child(span, true);
				var span_1 = sibling(span, 2);
				var text_1 = only_child(span_1, true);

				template_effect(() => {
					set_text(text, STATUS_LABEL[get(m).watch_status ?? ''] ?? 'Aktualisiert');
					set_text(text_1, get(m).title);
				});

				delegated('click', button, () => $$props.onopen(get(m)));
				append($$anchor, li);
			});
			append($$anchor, ul);
		};

		var alternate = ($$anchor) => {
			var p = root_2$4();

			append($$anchor, p);
		};

		if_block(node, ($$render) => {
			if (get(activity).length) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var div_1 = sibling(aside, 2);
	var section = child(div_1);
	var node_1 = sibling(child(section), 2);

	{
		var consequent_3 = ($$anchor) => {
			var div_2 = root_6$2();

			each(div_2, 21, () => get(inProgress), (m) => m.id, ($$anchor, m) => {
				var div_3 = root_5$2();
				var button_1 = child(div_3);
				var node_2 = child(button_1);

				{
					var consequent_1 = ($$anchor) => {
						var img = root_3$3();

						template_effect(() => set_attribute(img, 'src', get(m).cover_url));
						append($$anchor, img);
					};

					var alternate_1 = ($$anchor) => {
						var div_4 = root_4$3();
						var text_2 = only_child(div_4, true);

						template_effect(() => set_text(text_2, get(m).title?.[0] ?? '?'));
						append($$anchor, div_4);
					};

					if_block(node_2, ($$render) => {
						if (get(m).cover_url) $$render(consequent_1); else $$render(alternate_1, -1);
					});
				}

				var div_5 = sibling(node_2, 2);
				var span_2 = child(div_5);
				var text_3 = child(span_2);
				var node_3 = sibling(text_3);

				{
					var consequent_2 = ($$anchor) => {
						var text_4 = text();

						template_effect(() => set_text(text_4, `/ ${get(m).episodes ?? ''}`));
						append($$anchor, text_4);
					};

					if_block(node_3, ($$render) => {
						if (get(m).episodes) $$render(consequent_2);
					});
				}

				var button_2 = sibling(button_1, 2);
				var div_6 = sibling(button_2, 2);
				var text_5 = only_child(div_6, true);

				template_effect(() => {
					set_attribute(button_1, 'title', get(m).title);
					set_text(text_3, get(m).progress ?? 0);
					set_text(text_5, get(m).title);
				});

				delegated('click', button_1, () => $$props.onopen(get(m)));
				delegated('click', button_2, (e) => bump(get(m), e));
				append($$anchor, div_3);
			});
			append($$anchor, div_2);
		};

		var alternate_2 = ($$anchor) => {
			var p_1 = root_7$1();

			append($$anchor, p_1);
		};

		if_block(node_1, ($$render) => {
			if (get(inProgress).length) $$render(consequent_3); else $$render(alternate_2, -1);
		});
	}

	var node_4 = sibling(section, 4);

	{
		var consequent_4 = ($$anchor) => {
			var section_1 = root_9$1();
			var div_7 = sibling(child(section_1), 2);

			each(div_7, 21, () => get(trending), (m) => m.id, ($$anchor, m) => {
				var div_8 = root_8$1();
				var node_5 = child(div_8);

				Card(node_5, {
					get media() {
						return get(m);
					},

					get onopen() {
						return $$props.onopen;
					}
				});
				append($$anchor, div_8);
			});
			append($$anchor, section_1);
		};

		if_block(node_4, ($$render) => {
			if (get(trending).length) $$render(consequent_4);
		});
	}

	var node_6 = sibling(node_4, 2);

	{
		var consequent_5 = ($$anchor) => {
			var section_2 = root_10$1();
			var div_9 = sibling(child(section_2), 2);

			each(div_9, 21, () => get(newlyAdded), (m) => m.id, ($$anchor, m) => {
				var div_10 = root_8$1();
				var node_7 = child(div_10);

				Card(node_7, {
					get media() {
						return get(m);
					},

					get onopen() {
						return $$props.onopen;
					}
				});
				append($$anchor, div_10);
			});
			append($$anchor, section_2);
		};

		if_block(node_6, ($$render) => {
			if (get(newlyAdded).length) $$render(consequent_5);
		});
	}
	append($$anchor, div);
	pop();
}

delegate(['click']);

var root$3 = from_html(`<button><span> </span><i class="svelte-1nyrbv3"> </i></button>`);
var root_1$3 = from_html(`<button title="KI-Suche über den Inhalt">KI</button>`);
var root_2$3 = from_html(`<button class="reset svelte-1nyrbv3">Zurücksetzen</button>`);
var root_3$2 = from_html(`<button> </button>`);
var root_4$2 = from_html(`<div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Format</span> <div class="chips svelte-1nyrbv3"></div></div>`);
var root_5$1 = from_html(`<div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Genres</span> <div class="chips svelte-1nyrbv3"></div></div>`);
var root_6$1 = from_html(`<option> </option>`);
var root_7 = from_html(`<div class="placeholder svelte-1nyrbv3">lädt Liste…</div>`);
var root_8 = from_html(`<div class="placeholder svelte-1nyrbv3">Noch keine Einträge in dieser Liste.</div>`);
var root_9 = from_html(`<div class="sec-head svelte-1nyrbv3"><h2 class="svelte-1nyrbv3"> </h2> <span class="sec-count svelte-1nyrbv3"> </span></div>`);
var root_10 = from_html(`<div class="cards svelte-1nyrbv3"></div>`);
var root_11 = from_html(`<div class="row head svelte-1nyrbv3"><span class="c-title svelte-1nyrbv3">Titel</span> <span class="c-score svelte-1nyrbv3">Punktzahl</span> <span class="c-prog svelte-1nyrbv3">Fortschritt</span> <span class="c-type svelte-1nyrbv3">Typ</span></div>`);
var root_12 = from_html(`<img alt="" loading="lazy" class="svelte-1nyrbv3"/>`);
var root_13 = from_html(`<span class="ph svelte-1nyrbv3"> </span>`);
var root_14 = from_html(`<span class="cover svelte-1nyrbv3"><!></span>`);
var root_15 = from_html(`<span class="dot svelte-1nyrbv3"></span>`);
var root_16 = from_html(`<button class="row svelte-1nyrbv3"><span class="c-title svelte-1nyrbv3"><!> <!> <span class="tname svelte-1nyrbv3"> </span></span> <span class="c-score svelte-1nyrbv3"> </span> <span class="c-prog svelte-1nyrbv3"> </span> <span class="c-type svelte-1nyrbv3"> </span></button>`);
var root_17 = from_html(`<div><!> <!></div>`);
var root_18 = from_html(`<div class="section svelte-1nyrbv3"><!> <!></div>`);
var root_19 = from_html(`<div class="list-view svelte-1nyrbv3"><aside class="sidebar svelte-1nyrbv3"><nav class="lists svelte-1nyrbv3"><button><span>Alle</span><i class="svelte-1nyrbv3"> </i></button> <!></nav> <div class="filterbox svelte-1nyrbv3"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1nyrbv3"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4-4"></path></svg> <input class="svelte-1nyrbv3"/> <!> <button aria-label="Filter ein-/ausklappen"><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1nyrbv3"><path d="M3 5h18l-7 8v6l-4-2v-4z"></path></svg></button></div> <div><div class="fhd svelte-1nyrbv3"><span class="svelte-1nyrbv3">Filter</span> <!></div> <!> <!> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Synchro-Sprache</span> <div class="chips svelte-1nyrbv3"></div></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Punktzahl</span> <select class="svelte-1nyrbv3"><option>Alle Punkte</option><!></select></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Jahr</span> <div class="years svelte-1nyrbv3"><input type="number" class="svelte-1nyrbv3"/> <span class="dash svelte-1nyrbv3">–</span> <input type="number" class="svelte-1nyrbv3"/></div></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Sortieren</span> <select class="svelte-1nyrbv3"><option>Titel A–Z</option><option>Wertung</option><option>Beliebtheit</option><option>Zuletzt aktualisiert</option></select></div></div></div></aside> <section class="main svelte-1nyrbv3"><div class="toolbar svelte-1nyrbv3"><div class="view-toggle svelte-1nyrbv3"></div></div> <!></section></div>`);

const $$css$3 = {
	hash: 'svelte-1nyrbv3',
	code: '.list-view.svelte-1nyrbv3 {max-width:var(--maxw);margin:0 auto;padding:24px 20px 60px;display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start;}\n\n  /* ── Sidebar ── */.sidebar.svelte-1nyrbv3 {position:sticky;top:70px;display:flex;flex-direction:column;gap:16px;\n    /* Kategorien (oben) bleiben IMMER sichtbar; nur die Filterbox scrollt intern. */max-height:calc(100vh - 86px);}.lists.svelte-1nyrbv3 {flex:0 0 auto;}.filterbox.svelte-1nyrbv3 {flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}.filterbox.svelte-1nyrbv3::-webkit-scrollbar {width:8px;}.lists.svelte-1nyrbv3 {display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden;}.list-item.svelte-1nyrbv3 {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px;border:0;background:none;color:var(--text);cursor:pointer;font-size:0.88rem;font-weight:500;text-align:left;transition:background 0.12s, color 0.12s;}.list-item.svelte-1nyrbv3:hover {background:var(--surface-2);}.list-item.on.svelte-1nyrbv3 {background:var(--surface-2);color:var(--accent);font-weight:600;}.list-item.svelte-1nyrbv3 i:where(.svelte-1nyrbv3) {font-style:normal;font-size:0.78rem;font-weight:700;color:var(--text-muted);}.list-item.on.svelte-1nyrbv3 i:where(.svelte-1nyrbv3) {color:var(--accent);}.filterbox.svelte-1nyrbv3 {background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:14px 15px;}.search.svelte-1nyrbv3 {display:flex;align-items:center;gap:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0 10px;margin-bottom:14px;}.search.ai.svelte-1nyrbv3 {border-color:var(--accent);}.search.svelte-1nyrbv3 svg:where(.svelte-1nyrbv3) {width:15px;height:15px;color:var(--text-muted);flex:0 0 auto;}.search.svelte-1nyrbv3 input:where(.svelte-1nyrbv3) {flex:1;min-width:0;border:0;background:none;color:var(--text);padding:8px 0;outline:none;font-size:0.84rem;}.search.svelte-1nyrbv3 .ki:where(.svelte-1nyrbv3) {flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--radius-sm);padding:3px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;}.search.svelte-1nyrbv3 .ki.on:where(.svelte-1nyrbv3) {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.fhd.svelte-1nyrbv3 {display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}.fhd.svelte-1nyrbv3 span:where(.svelte-1nyrbv3) {font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--text-muted);}.reset.svelte-1nyrbv3 {background:none;border:0;color:var(--text-muted);cursor:pointer;font-size:0.74rem;padding:0;}.reset.svelte-1nyrbv3:hover {color:var(--accent);}.grp.svelte-1nyrbv3 {margin-bottom:14px;}.grp.svelte-1nyrbv3:last-child {margin-bottom:0;}.glabel.svelte-1nyrbv3 {display:block;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:var(--text-muted);margin-bottom:7px;}.chips.svelte-1nyrbv3 {display:flex;flex-wrap:wrap;gap:5px;}.chip.svelte-1nyrbv3 {padding:5px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:0.76rem;font-weight:500;line-height:1.2;white-space:nowrap;transition:background 0.12s, color 0.12s, border-color 0.12s;}.chip.svelte-1nyrbv3:hover {border-color:var(--accent);color:var(--accent);}.chip.on.svelte-1nyrbv3 {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.chip.on.svelte-1nyrbv3:hover {color:var(--on-accent);}.years.svelte-1nyrbv3 {display:flex;align-items:center;gap:7px;}.years.svelte-1nyrbv3 input:where(.svelte-1nyrbv3) {width:100%;min-width:0;}.dash.svelte-1nyrbv3 {color:var(--text-muted);}input[type=\'number\'].svelte-1nyrbv3, select.svelte-1nyrbv3 {padding:7px 9px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:0.8rem;font-family:inherit;}input[type=\'number\'].svelte-1nyrbv3:focus, select.svelte-1nyrbv3:focus {outline:none;border-color:var(--accent);}select.svelte-1nyrbv3 {width:100%;cursor:pointer;}\n\n  /* ── Hauptbereich ── */.main.svelte-1nyrbv3 {min-width:0;}.toolbar.svelte-1nyrbv3 {display:flex;justify-content:flex-end;margin-bottom:16px;}.view-toggle.svelte-1nyrbv3 {display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:3px;}.view-toggle.svelte-1nyrbv3 button:where(.svelte-1nyrbv3) {width:32px;height:30px;border:0;border-radius:var(--radius-sm);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem;line-height:1;display:grid;place-items:center;transition:background 0.12s, color 0.12s;}.view-toggle.svelte-1nyrbv3 button:where(.svelte-1nyrbv3):hover {color:var(--text);}.view-toggle.svelte-1nyrbv3 button.on:where(.svelte-1nyrbv3) {background:var(--accent);color:var(--on-accent);}.section.svelte-1nyrbv3 {margin-bottom:28px;}.sec-head.svelte-1nyrbv3 {display:flex;align-items:baseline;gap:10px;margin-bottom:10px;}.sec-head.svelte-1nyrbv3 h2:where(.svelte-1nyrbv3) {margin:0;font-size:0.95rem;font-weight:600;color:var(--text-strong);}.sec-count.svelte-1nyrbv3 {font-size:0.78rem;color:var(--text-muted);font-weight:600;}\n\n  /* ── Tabelle ── */.table.svelte-1nyrbv3 {display:flex;flex-direction:column;gap:8px;}.row.svelte-1nyrbv3 {display:grid;grid-template-columns:1fr 90px 100px 110px;align-items:center;gap:12px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:8px 14px;color:var(--text);cursor:pointer;font:inherit;transition:background 0.12s, transform 0.12s;}.row.svelte-1nyrbv3:hover {background:var(--surface-2);}.row.head.svelte-1nyrbv3 {background:none;border:0;box-shadow:none;padding:0 14px 4px;cursor:default;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:var(--text-muted);}.c-title.svelte-1nyrbv3 {display:flex;align-items:center;gap:12px;min-width:0;}.cover.svelte-1nyrbv3 {flex:0 0 auto;width:40px;aspect-ratio:185 / 265;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-2);}.cover.svelte-1nyrbv3 img:where(.svelte-1nyrbv3) {width:100%;height:100%;object-fit:cover;display:block;}.cover.svelte-1nyrbv3 .ph:where(.svelte-1nyrbv3) {width:100%;height:100%;display:grid;place-items:center;font-weight:600;color:var(--text-muted);font-size:0.9rem;}.dot.svelte-1nyrbv3 {flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:var(--good);box-shadow:0 0 0 2px color-mix(in srgb, var(--good) 30%, transparent);}.tname.svelte-1nyrbv3 {min-width:0;font-size:0.88rem;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.row.svelte-1nyrbv3:hover .tname:where(.svelte-1nyrbv3) {color:var(--accent);}.c-score.svelte-1nyrbv3 {color:var(--good);font-weight:600;font-size:0.86rem;text-align:center;}.c-prog.svelte-1nyrbv3 {color:var(--text);font-size:0.84rem;text-align:center;}.c-type.svelte-1nyrbv3 {color:var(--text-muted);font-size:0.82rem;text-align:center;}\n\n  /* Kompakte Zeilen: ohne Cover, dichter, einzeilige Pillen */.table.compact.svelte-1nyrbv3 {gap:3px;}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3) {grid-template-columns:1fr 70px 90px 100px;padding:7px 14px;box-shadow:none;border-color:transparent;border-radius:var(--radius-sm);background:none;}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3):nth-child(odd) {background:var(--surface);}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3):hover {background:var(--surface-2);}\n\n  /* ── Karten ── */.cards.svelte-1nyrbv3 {display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:18px;}.placeholder.svelte-1nyrbv3 {text-align:center;color:var(--text-muted);padding:60px 0;font-size:0.9rem;}.ftoggle.svelte-1nyrbv3 {display:none;}\n  @media (max-width: 760px) {.ftoggle.svelte-1nyrbv3 {display:grid;place-items:center;width:30px;height:28px;border:0;background:none;color:var(--text-muted);cursor:pointer;}.ftoggle.svelte-1nyrbv3 svg:where(.svelte-1nyrbv3) {width:17px;height:17px;}.ftoggle.on.svelte-1nyrbv3 {color:var(--accent);}.fbody.closed.svelte-1nyrbv3 {display:none;}.list-view.svelte-1nyrbv3 {grid-template-columns:1fr;gap:16px;}.sidebar.svelte-1nyrbv3 {position:static;}.lists.svelte-1nyrbv3 {flex-direction:row;flex-wrap:wrap;}.list-item.svelte-1nyrbv3 {flex:1 0 auto;}.row.svelte-1nyrbv3, .table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3) {grid-template-columns:1fr 44px 58px;gap:8px;padding:8px 10px;}.row.head.svelte-1nyrbv3 {font-size:0.6rem;letter-spacing:0;padding:0 10px 4px;}.row.head.svelte-1nyrbv3 .c-score:where(.svelte-1nyrbv3), .row.head.svelte-1nyrbv3 .c-prog:where(.svelte-1nyrbv3) {font-size:0;}.row.head.svelte-1nyrbv3 .c-score:where(.svelte-1nyrbv3)::after {content:\'★\';font-size:0.75rem;}.row.head.svelte-1nyrbv3 .c-prog:where(.svelte-1nyrbv3)::after {content:\'Ep.\';font-size:0.6rem;}.tname.svelte-1nyrbv3 {white-space:normal !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.filterbox.svelte-1nyrbv3 {padding:8px 10px;}.fbody.svelte-1nyrbv3:not(.closed) {margin-top:10px;}.c-type.svelte-1nyrbv3 {display:none;}.row.head.svelte-1nyrbv3 .c-type:where(.svelte-1nyrbv3) {display:none;}.cards.svelte-1nyrbv3 {grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));}\n  }'
};

function AnimeList($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$3);

	user_effect(() => {
		if (!aiState.loaded) refreshAi();
	});

	let hToken = prop($$props, 'hToken', 3, null);

	// ── Deutsche Labels (AniList-Deutsch) ──────────────────────────────
	const STATUS_LABEL = {
		watching: 'Beobachten',
		rewatching: 'Wiederanschauen',
		completed: 'Abgeschlossen',
		paused: 'Pausiert',
		dropped: 'Fallen Gelassen',
		planning: 'Planung'
	};

	// Reihenfolge der Abschnitte bei „Alle"
	const STATUS_ORDER = [
		'watching',
		'rewatching',
		'completed',
		'paused',
		'dropped',
		'planning'
	];

	// „aktiv" = grüner Punkt
	const ACTIVE = new Set(['watching', 'rewatching']);

	const FORMAT_LABEL = {
		TV: 'Fernseher',
		TV_SHORT: 'TV-Kurzfilm',
		MOVIE: 'Film',
		SPECIAL: 'Spezial',
		OVA: 'OVA',
		ONA: 'ONA',
		MUSIC: 'Musik'
	};

	const fmtType = (f) => f ? FORMAT_LABEL[f] ?? f : '–';
	const fmtScore = (r) => r ? String(r).replace('.', ',') : '';

	const fmtProgress = (m) => {
		const p = m.progress ?? 0;
		const e = m.episodes;

		return e ? `${p}/${e}` : p ? String(p) : '–';
	};

	// ── Zustand ────────────────────────────────────────────────────────
	let selectedList = state('all' // 'all' | status
	);

	let viewMode = state('table');
	let search = state('');

	let filters = proxy({
		format: [],
		genres: [],
		yearMin: null,
		yearMax: null,
		dubLang: '',
		rating: '',
		sort: 'title'
	});

	let filtersOpen = state(false // nur mobil relevant: Filter einklappbar
	);
	let ai = state(false // KI-/Semantik-Suche im Suchfeld
	);
	let counts = state(proxy({}));

	let meta = state(proxy({
		formats: [],
		genres: [],
		statuses: [],
		year_min: null,
		year_max: null
	}));

	let sections = state(proxy([] // bei „Alle": je Kategorie ein Abschnitt; sonst 1 Abschnitt
	));
	let loading = state(false);

	// ── Zähler (unfiltert, wie AniList) ─────────────────────────────────
	function refreshCounts() {
		$$props.api.profileStats().then((s) => set(counts, { all: s.total ?? 0, ...s.by_status ?? {} }, true)).catch(() => {});
	}

	// ── Filter-Metadaten pro Config ─────────────────────────────────────
	user_effect(() => {
		const mt = $$props.activeType.media_type;
		const sp = $$props.activeType.space;
		const tok = sp === 'h' ? hToken() : null;

		$$props.api.metaFilters({ space: sp, media_type: mt }, tok).then((m) => set(meta, m, true)).catch(() => {});
	});

	user_effect(() => {
		// bei Config-Wechsel Zähler neu holen
		void $$props.activeType;

		void hToken();
		refreshCounts();
	});

	// ── Daten laden ─────────────────────────────────────────────────────
	function buildQuery(status) {
		const q = {
			media_type: $$props.activeType.media_type,
			limit: 1000,
			sort: filters.sort
		};

		if (status !== 'all' && status !== 'fav') q.watch_status = status;
		if (status === 'fav') q.favorite = 1;
		if (filters.format.length) q.format = filters.format.join(',');
		if (filters.genres.length) q.genres = filters.genres.join(',');
		if (filters.yearMin) q.year_min = filters.yearMin;
		if (filters.yearMax) q.year_max = filters.yearMax;
		if (filters.dubLang) q.dub_lang = filters.dubLang;
		if (filters.rating) q.rating = filters.rating;
		if (!get(ai) && get(search).trim()) q.q = get(search).trim();

		return q;
	}

	async function fetchList(status) {
		const q = buildQuery(status);
		const tok = $$props.activeType.space === 'h' ? hToken() : null;
		let d;

		if (get(ai) && get(search).trim()) {
			// KI-/Semantik-Suche GLEICHZEITIG mit den Listen-Filtern
			d = await $$props.api.aiSearch(
				{
					q: get(search).trim(),
					space: $$props.activeType.space,
					...q,
					limit: 40
				},
				tok
			);

			return d?.results ?? [];
		}

		if ($$props.activeType.space === 'h') {
			if (!hToken()) return [];

			d = await $$props.api.h(hToken(), q);
		} else {
			d = await $$props.api.anime(q);
		}

		return d?.items ?? [];
	}

	let reqId = 0;

	async function load() {
		const my = ++reqId;

		set(loading, true);

		try {
			if (get(selectedList) === 'all') {
				// Jede (laut Zähler) nicht-leere Kategorie als eigener Abschnitt.
				// Ohne Zähler: alle versuchen; leere Ergebnisse werden ausgeblendet.
				const wanted = STATUS_ORDER.filter((s) => (get(counts)[s] ?? 1) > 0);

				const results = await Promise.all(wanted.map((s) => fetchList(s).then((items) => ({ status: s, items }))));

				if (my !== reqId) return;

				set(sections, results.filter((r) => r.items.length > 0), true);
			} else {
				const items = await fetchList(get(selectedList));

				if (my !== reqId) return;

				set(sections, [{ status: get(selectedList), items }], true);
			}
		} catch(e) {
			if (my === reqId) set(sections, [], true);

			console.error('AnimeList load failed', e);
		} finally {
			if (my === reqId) set(loading, false);
		}
	}

	let timer;

	user_effect(() => {
		// Abhängigkeiten anfassen → Reload (mit kleinem Debounce fürs Suchfeld)
		void get(selectedList);

		void get(search);
		void get(ai);
		JSON.stringify(filters);
		void $$props.activeType;
		void hToken();
		void get(counts // „Alle" braucht die Zählerliste, um Kategorien zu bestimmen
		);
		clearTimeout(timer);
		timer = setTimeout(load, 180);
	});

	// ── Filter-Helfer ───────────────────────────────────────────────────
	function toggle(arr, v) {
		const i = arr.indexOf(v);

		if (i >= 0) arr.splice(i, 1); else arr.push(v);
	}

	function resetFilters() {
		filters.format = [];
		filters.genres = [];
		filters.yearMin = null;
		filters.yearMax = null;
		filters.dubLang = '';
		filters.rating = '';
		filters.sort = 'title';
		set(search, '');
	}

	let filterCount = user_derived(() => filters.format.length + filters.genres.length + (filters.yearMin || filters.yearMax ? 1 : 0) + (filters.dubLang ? 1 : 0) + (filters.rating ? 1 : 0));

	const VIEW_MODES = [
		['table', '▤', 'Tabelle'],
		['compact', '≣', 'Kompakte Zeilen'],
		['cards', '▦', 'Karten']
	];

	var div = root_19();
	var aside = child(div);
	var nav = child(aside);
	var button = child(nav);
	let classes;
	var i_1 = sibling(child(button));
	var text = only_child(i_1, true);

	var node = sibling(button, 2);

	each(node, 17, () => STATUS_ORDER, index, ($$anchor, s) => {
		var button_1 = root$3();
		let classes_1;
		var span = child(button_1);
		var text_1 = only_child(span, true);
		var i_2 = sibling(span);
		var text_2 = only_child(i_2, true);

		template_effect(() => {
			classes_1 = set_class(button_1, 1, 'list-item svelte-1nyrbv3', null, classes_1, { on: get(selectedList) === get(s) });
			set_text(text_1, STATUS_LABEL[get(s)]);
			set_text(text_2, get(counts)[get(s)] ?? '');
		});

		delegated('click', button_1, () => set(selectedList, get(s), true));
		append($$anchor, button_1);
	});

	var div_1 = sibling(nav, 2);
	var div_2 = child(div_1);
	let classes_2;
	var input = sibling(child(div_2), 2);

	var node_1 = sibling(input, 2);

	{
		var consequent = ($$anchor) => {
			var button_2 = root_1$3();
			let classes_3;

			template_effect(() => classes_3 = set_class(button_2, 1, 'ki svelte-1nyrbv3', null, classes_3, { on: get(ai) }));
			delegated('click', button_2, () => set(ai, !get(ai)));
			append($$anchor, button_2);
		};

		if_block(node_1, ($$render) => {
			if (aiState.enabled) $$render(consequent);
		});
	}

	var button_3 = sibling(node_1, 2);
	let classes_4;

	var div_3 = sibling(div_2, 2);
	let classes_5;
	var div_4 = child(div_3);
	var node_2 = sibling(child(div_4), 2);

	{
		var consequent_1 = ($$anchor) => {
			var button_4 = root_2$3();

			delegated('click', button_4, resetFilters);
			append($$anchor, button_4);
		};

		if_block(node_2, ($$render) => {
			if (get(filterCount) > 0 || get(search)) $$render(consequent_1);
		});
	}

	var node_3 = sibling(div_4, 2);

	{
		var consequent_2 = ($$anchor) => {
			var div_5 = root_4$2();
			var div_6 = sibling(child(div_5), 2);

			each(div_6, 21, () => get(meta).formats, index, ($$anchor, f) => {
				var button_5 = root_3$2();
				let classes_6;
				var text_3 = only_child(button_5, true);

				template_effect(
					($0, $1) => {
						classes_6 = set_class(button_5, 1, 'chip svelte-1nyrbv3', null, classes_6, { on: $0 });
						set_text(text_3, $1);
					},
					[
						() => filters.format.includes(get(f)),
						() => fmtType(get(f))
					]
				);

				delegated('click', button_5, () => toggle(filters.format, get(f)));
				append($$anchor, button_5);
			});
			append($$anchor, div_5);
		};

		if_block(node_3, ($$render) => {
			if ((get(meta).formats ?? []).length) $$render(consequent_2);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_3 = ($$anchor) => {
			var div_7 = root_5$1();
			var div_8 = sibling(child(div_7), 2);

			each(div_8, 21, () => get(meta).genres, index, ($$anchor, g) => {
				var button_6 = root_3$2();
				let classes_7;
				var text_4 = only_child(button_6, true);

				template_effect(
					($0) => {
						classes_7 = set_class(button_6, 1, 'chip svelte-1nyrbv3', null, classes_7, { on: $0 });
						set_text(text_4, get(g));
					},
					[() => filters.genres.includes(get(g))]
				);

				delegated('click', button_6, () => toggle(filters.genres, get(g)));
				append($$anchor, button_6);
			});
			append($$anchor, div_7);
		};

		if_block(node_4, ($$render) => {
			if ((get(meta).genres ?? []).length) $$render(consequent_3);
		});
	}

	var div_9 = sibling(node_4, 2);
	var div_10 = sibling(child(div_9), 2);

	each(div_10, 21, () => DUB_LANGS, index, ($$anchor, $$item) => {
		var $$array = user_derived(() => to_array(get($$item), 2));
		let v = () => get($$array)[0];
		let l = () => get($$array)[1];
		var button_7 = root_3$2();
		let classes_8;
		var text_5 = only_child(button_7, true);

		template_effect(() => {
			classes_8 = set_class(button_7, 1, 'chip svelte-1nyrbv3', null, classes_8, { on: filters.dubLang === v() });
			set_text(text_5, l());
		});

		delegated('click', button_7, () => filters.dubLang = filters.dubLang === v() ? '' : v());
		append($$anchor, button_7);
	});

	var div_11 = sibling(div_9, 2);
	var select = sibling(child(div_11), 2);
	var option = child(select);

	option.value = option.__value = '';

	var node_5 = sibling(option);

	each(node_5, 16, () => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], index, ($$anchor, r) => {
		var option_1 = root_6$1();
		var text_6 = only_child(option_1, true);
		var option_1_value = {};

		template_effect(
			($0) => {
				set_text(text_6, r);

				if (option_1_value !== (option_1_value = $0)) {
					option_1.value = (option_1.__value = option_1_value) ?? '';
				}
			},
			[() => String(r)]
		);

		append($$anchor, option_1);
	});
	init_select(select);

	var div_12 = sibling(div_11, 2);
	var div_13 = sibling(child(div_12), 2);
	var input_1 = child(div_13);

	var input_2 = sibling(input_1, 4);

	var div_14 = sibling(div_12, 2);
	var select_1 = sibling(child(div_14), 2);
	var option_2 = child(select_1);

	option_2.value = option_2.__value = 'title';

	var option_3 = sibling(option_2);

	option_3.value = option_3.__value = 'score';

	var option_4 = sibling(option_3);

	option_4.value = option_4.__value = 'popularity';

	var option_5 = sibling(option_4);

	option_5.value = option_5.__value = 'recent';
	init_select(select_1);

	var section = sibling(aside, 2);
	var div_15 = child(section);
	var div_16 = child(div_15);

	each(div_16, 21, () => VIEW_MODES, index, ($$anchor, $$item) => {
		var $$array_1 = user_derived(() => to_array(get($$item), 3));
		let mode = () => get($$array_1)[0];
		let icon = () => get($$array_1)[1];
		let label = () => get($$array_1)[2];
		var button_8 = root_3$2();
		let classes_9;
		var text_7 = only_child(button_8, true);

		template_effect(() => {
			set_attribute(button_8, 'title', label());
			set_attribute(button_8, 'aria-label', label());
			classes_9 = set_class(button_8, 1, 'svelte-1nyrbv3', null, classes_9, { on: get(viewMode) === mode() });
			set_text(text_7, icon());
		});

		delegated('click', button_8, () => set(viewMode, mode(), true));
		append($$anchor, button_8);
	});

	var node_6 = sibling(div_15, 2);

	{
		var consequent_4 = ($$anchor) => {
			var div_17 = root_7();

			append($$anchor, div_17);
		};

		var consequent_5 = ($$anchor) => {
			var div_18 = root_8();

			append($$anchor, div_18);
		};

		var alternate_2 = ($$anchor) => {
			var fragment = comment();
			var node_7 = first_child(fragment);

			each(node_7, 17, () => get(sections), (sec) => sec.status, ($$anchor, sec) => {
				var div_19 = root_18();
				var node_8 = child(div_19);

				{
					var consequent_6 = ($$anchor) => {
						var div_20 = root_9();
						var h2 = child(div_20);
						var text_8 = only_child(h2, true);
						var span_1 = sibling(h2, 2);
						var text_9 = only_child(span_1, true);

						template_effect(() => {
							set_text(text_8, STATUS_LABEL[get(sec).status]);
							set_text(text_9, get(sec).items.length);
						});

						append($$anchor, div_20);
					};

					if_block(node_8, ($$render) => {
						if (get(selectedList) === 'all') $$render(consequent_6);
					});
				}

				var node_9 = sibling(node_8, 2);

				{
					var consequent_7 = ($$anchor) => {
						var div_21 = root_10();

						each(div_21, 21, () => get(sec).items, (m) => m.id, ($$anchor, m) => {
							Card($$anchor, {
								get media() {
									return get(m);
								},

								get onopen() {
									return $$props.onopen;
								}
							});
						});
						append($$anchor, div_21);
					};

					var alternate_1 = ($$anchor) => {
						var div_22 = root_17();
						let classes_10;
						var node_10 = child(div_22);

						{
							var consequent_8 = ($$anchor) => {
								var div_23 = root_11();

								append($$anchor, div_23);
							};

							if_block(node_10, ($$render) => {
								if (get(viewMode) === 'table') $$render(consequent_8);
							});
						}

						var node_11 = sibling(node_10, 2);

						each(node_11, 17, () => get(sec).items, (m) => m.id, ($$anchor, m) => {
							var button_9 = root_16();
							var span_2 = child(button_9);
							var node_12 = child(span_2);

							{
								var consequent_10 = ($$anchor) => {
									var span_3 = root_14();
									var node_13 = child(span_3);

									{
										var consequent_9 = ($$anchor) => {
											var img = root_12();

											template_effect(() => set_attribute(img, 'src', get(m).cover_url));
											append($$anchor, img);
										};

										var alternate = ($$anchor) => {
											var span_4 = root_13();
											var text_10 = only_child(span_4, true);

											template_effect(() => set_text(text_10, get(m).title?.[0] ?? '?'));
											append($$anchor, span_4);
										};

										if_block(node_13, ($$render) => {
											if (get(m).cover_url) $$render(consequent_9); else $$render(alternate, -1);
										});
									}
									append($$anchor, span_3);
								};

								if_block(node_12, ($$render) => {
									if (get(viewMode) === 'table') $$render(consequent_10);
								});
							}

							var node_14 = sibling(node_12, 2);

							{
								var consequent_11 = ($$anchor) => {
									var span_5 = root_15();

									template_effect(() => set_attribute(span_5, 'title', STATUS_LABEL[get(m).watch_status ?? '']));
									append($$anchor, span_5);
								};

								var d_1 = user_derived(() => ACTIVE.has(get(m).watch_status ?? ''));

								if_block(node_14, ($$render) => {
									if (get(d_1)) $$render(consequent_11);
								});
							}

							var span_6 = sibling(node_14, 2);
							var text_11 = only_child(span_6, true);

							var span_7 = sibling(span_2, 2);
							var text_12 = only_child(span_7, true);
							var span_8 = sibling(span_7, 2);
							var text_13 = only_child(span_8, true);
							var span_9 = sibling(span_8, 2);
							var text_14 = only_child(span_9, true);

							template_effect(
								($0, $1, $2) => {
									set_text(text_11, get(m).title);
									set_text(text_12, $0);
									set_text(text_13, $1);
									set_text(text_14, $2);
								},
								[
									() => fmtScore(get(m).rating) || '–',
									() => fmtProgress(get(m)),
									() => fmtType(get(m).format)
								]
							);

							delegated('click', button_9, () => $$props.onopen(get(m)));
							append($$anchor, button_9);
						});
						template_effect(() => classes_10 = set_class(div_22, 1, 'table svelte-1nyrbv3', null, classes_10, { compact: get(viewMode) === 'compact' }));
						append($$anchor, div_22);
					};

					if_block(node_9, ($$render) => {
						if (get(viewMode) === 'cards') $$render(consequent_7); else $$render(alternate_1, -1);
					});
				}
				append($$anchor, div_19);
			});

			append($$anchor, fragment);
		};

		if_block(node_6, ($$render) => {
			if (get(loading) && get(sections).length === 0) $$render(consequent_4); else if (get(sections).length === 0) $$render(consequent_5, 1); else $$render(alternate_2, -1);
		});
	}

	template_effect(
		($0, $1) => {
			classes = set_class(button, 1, 'list-item svelte-1nyrbv3', null, classes, { on: get(selectedList) === 'all' });
			set_text(text, get(counts).all ?? '');
			classes_2 = set_class(div_2, 1, 'search svelte-1nyrbv3', null, classes_2, { ai: get(ai) });
			set_attribute(input, 'placeholder', get(ai) ? 'KI: Story/Thema…' : 'Filter');
			classes_4 = set_class(button_3, 1, 'ftoggle svelte-1nyrbv3', null, classes_4, { on: get(filtersOpen) });
			set_attribute(button_3, 'aria-expanded', get(filtersOpen));
			classes_5 = set_class(div_3, 1, 'fbody svelte-1nyrbv3', null, classes_5, { closed: !get(filtersOpen) });
			set_attribute(input_1, 'placeholder', $0);
			set_attribute(input_2, 'placeholder', $1);
		},
		[
			() => String(get(meta).year_min ?? 'von'),
			() => String(get(meta).year_max ?? 'bis')
		]
	);

	delegated('click', button, () => set(selectedList, 'all'));
	bind_value(input, () => get(search), ($$value) => set(search, $$value));
	delegated('click', button_3, () => set(filtersOpen, !get(filtersOpen)));
	bind_select_value(select, () => filters.rating, ($$value) => filters.rating = $$value);
	bind_value(input_1, () => filters.yearMin, ($$value) => filters.yearMin = $$value);
	bind_value(input_2, () => filters.yearMax, ($$value) => filters.yearMax = $$value);
	bind_select_value(select_1, () => filters.sort, ($$value) => filters.sort = $$value);
	append($$anchor, div);
	pop();
}

delegate(['click']);

var root$2 = from_html(`<div class="ph svelte-1i22kfc">lädt…</div>`);
var root_1$2 = from_html(`<div class="ph svelte-1i22kfc">Noch keine Favoriten. Öffne einen Titel und tippe auf das ♥.</div>`);
var root_2$2 = from_html(`<img alt="" draggable="false" class="svelte-1i22kfc"/>`);
var root_3$1 = from_html(`<span class="ph2 svelte-1i22kfc"> </span>`);
var root_4$1 = from_html(`<div draggable="true" role="button" tabindex="0"><span class="rank svelte-1i22kfc"> </span> <div class="cover svelte-1i22kfc"><!></div> <span class="title svelte-1i22kfc"> </span> <button class="heart svelte-1i22kfc" title="Aus Favoriten entfernen" aria-label="Entfernen">♥</button></div>`);
var root_5 = from_html(`<div class="grid svelte-1i22kfc"></div>`);
var root_6 = from_html(`<div class="favview svelte-1i22kfc"><header class="fhead svelte-1i22kfc"><h1 class="svelte-1i22kfc">Favoriten</h1> <p class="svelte-1i22kfc">Zieh die Einträge, um deine Rangliste zu ordnen — Platz 1 oben links.</p></header> <!></div>`);

const $$css$2 = {
	hash: 'svelte-1i22kfc',
	code: '.favview.svelte-1i22kfc {max-width:var(--maxw);margin:0 auto;padding:28px 20px 60px;}.fhead.svelte-1i22kfc h1:where(.svelte-1i22kfc) {margin:0;font-size:1.5rem;font-weight:600;color:var(--text-strong);}.fhead.svelte-1i22kfc p:where(.svelte-1i22kfc) {margin:4px 0 24px;color:var(--text-muted);font-size:0.88rem;}.ph.svelte-1i22kfc {text-align:center;color:var(--text-muted);padding:60px 0;}.grid.svelte-1i22kfc {display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:18px;}.fav.svelte-1i22kfc {position:relative;cursor:grab;display:flex;flex-direction:column;gap:6px;}.fav.svelte-1i22kfc:active {cursor:grabbing;}.fav.dragging.svelte-1i22kfc {opacity:0.45;}.rank.svelte-1i22kfc {position:absolute;top:6px;left:6px;z-index:2;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:0.82rem;min-width:22px;height:22px;padding:0 5px;border-radius:var(--radius-sm);display:grid;place-items:center;box-shadow:var(--shadow-sm);}.cover.svelte-1i22kfc {aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;background:var(--surface);box-shadow:var(--shadow-sm);}.cover.svelte-1i22kfc img:where(.svelte-1i22kfc) {width:100%;height:100%;object-fit:cover;}.ph2.svelte-1i22kfc {width:100%;height:100%;display:grid;place-items:center;color:var(--text-muted);font-weight:600;}.title.svelte-1i22kfc {font-size:0.85rem;font-weight:500;color:var(--text);line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.heart.svelte-1i22kfc {position:absolute;top:6px;right:6px;z-index:2;width:26px;height:26px;border:0;border-radius:50%;background:rgba(0, 0, 0, 0.55);color:var(--accent);cursor:pointer;font-size:0.9rem;line-height:1;}'
};

function Favorites($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$2);

	let hToken = prop($$props, 'hToken', 3, null);
	let items = state(proxy([]));
	let loading = state(true);
	let dragI = state(null);

	async function loadFav() {
		set(loading, true);

		try {
			const q = {
				favorite: 1,
				sort: 'favorite',
				limit: 500,
				media_type: $$props.activeType.media_type
			};

			const d = $$props.activeType.space === 'h'
				? hToken() ? await $$props.api.h(hToken(), q) : { items: [] }
				: await $$props.api.anime(q);

			set(items, d?.items ?? [], true);
		} catch {
			set(items, [], true);
		} finally {
			set(loading, false);
		}
	}

	user_effect(() => {
		void $$props.activeType;
		void hToken();
		loadFav();
	});

	function persist() {
		$$props.api.reorderFavorites(get(items).map((m) => m.id)).catch(() => {});
	}

	function onDragStart(i) {
		set(dragI, i, true);
	}

	function onDragOver(e, i) {
		e.preventDefault();

		if (get(dragI) === null || get(dragI) === i) return;

		const arr = [...get(items)];
		const [m] = arr.splice(get(dragI), 1);

		arr.splice(i, 0, m);
		set(items, arr, true);
		set(dragI, i, true);
	}

	function onDrop() {
		if (get(dragI) !== null) {
			set(dragI, null);
			persist();
		}
	}

	async function unfav(m, e) {
		e.stopPropagation();

		try {
			await $$props.api.patchEntry(m.id, { favorite: 0 });
		} catch {}

		set(items, get(items).filter((x) => x.id !== m.id), true);
		persist();
	}

	var div = root_6();
	var node = sibling(child(div), 2);

	{
		var consequent = ($$anchor) => {
			var div_1 = root$2();

			append($$anchor, div_1);
		};

		var consequent_1 = ($$anchor) => {
			var div_2 = root_1$2();

			append($$anchor, div_2);
		};

		var alternate_1 = ($$anchor) => {
			var div_3 = root_5();

			each(div_3, 23, () => get(items), (m) => m.id, ($$anchor, m, i) => {
				var div_4 = root_4$1();
				let classes;
				var span = child(div_4);
				var text = only_child(span, true);
				var div_5 = sibling(span, 2);
				var node_1 = child(div_5);

				{
					var consequent_2 = ($$anchor) => {
						var img = root_2$2();

						template_effect(() => set_attribute(img, 'src', get(m).cover_url));
						append($$anchor, img);
					};

					var alternate = ($$anchor) => {
						var span_1 = root_3$1();
						var text_1 = only_child(span_1, true);

						template_effect(() => set_text(text_1, get(m).title?.[0] ?? '?'));
						append($$anchor, span_1);
					};

					if_block(node_1, ($$render) => {
						if (get(m).cover_url) $$render(consequent_2); else $$render(alternate, -1);
					});
				}

				var span_2 = sibling(div_5, 2);
				var text_2 = only_child(span_2, true);
				var button = sibling(span_2, 2);

				template_effect(() => {
					classes = set_class(div_4, 1, 'fav svelte-1i22kfc', null, classes, { dragging: get(dragI) === get(i) });
					set_text(text, get(i) + 1);
					set_text(text_2, get(m).title);
				});

				event('dragstart', div_4, () => onDragStart(get(i)));
				event('dragover', div_4, (e) => onDragOver(e, get(i)));
				event('drop', div_4, onDrop);
				event('dragend', div_4, onDrop);
				delegated('click', div_4, () => $$props.onopen(get(m)));

				delegated('keydown', div_4, (e) => {
					if (e.key === 'Enter') $$props.onopen(get(m));
				});

				delegated('click', button, (e) => unfav(get(m), e));
				append($$anchor, div_4);
			});
			append($$anchor, div_3);
		};

		if_block(node, ($$render) => {
			if (get(loading)) $$render(consequent); else if (get(items).length === 0) $$render(consequent_1, 1); else $$render(alternate_1, -1);
		});
	}
	append($$anchor, div);
	pop();
}

delegate(['click', 'keydown']);

let el = null;
const setHost = (e) => {
  el = e;
};
const hostEl = () => el ?? document.documentElement;

var root$1 = from_html(`<button class="mback svelte-1bojhsa" aria-label="Menü schließen"></button> <div class="mpanel svelte-1bojhsa" role="menu"><button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 21 3.6 12.9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 8.4 6.9z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"></path></svg> </button> <button class="svelte-1bojhsa"><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"></path></svg>Einstellungen</button></div>`, 1);
var root_1$1 = from_html(`<button class="fab svelte-1bojhsa" aria-label="Menü öffnen">☰</button>`);
var root_2$1 = from_html(`<header class="topbar svelte-1bojhsa"><div class="bar svelte-1bojhsa"><button class="brand svelte-1bojhsa" title="Medientyp wählen">Orbit<span class="svelte-1bojhsa">list</span> <em class="svelte-1bojhsa"> </em></button> <nav class="views svelte-1bojhsa"><button> </button> <button> </button> <button> </button> <button> </button> <button> </button></nav> <div class="spacer svelte-1bojhsa"></div> <button class="icon svelte-1bojhsa" title="Einstellungen" aria-label="Einstellungen">⚙</button></div></header> <div class="mnav svelte-1bojhsa"><!></div> <!> <!> <!> <!>`, 1);

const $$css$1 = {
	hash: 'svelte-1bojhsa',
	code: '.topbar.svelte-1bojhsa {position:sticky;top:0;z-index:20;background:var(--nav);border-bottom:1px solid var(--border);box-shadow:var(--shadow-sm);}.bar.svelte-1bojhsa {max-width:var(--maxw);margin:0 auto;display:flex;align-items:center;gap:16px;padding:10px 20px;}.brand.svelte-1bojhsa {background:none;border:0;color:var(--text-strong);font-weight:800;font-size:1.15rem;letter-spacing:-0.02em;cursor:pointer;}.brand.svelte-1bojhsa span:where(.svelte-1bojhsa) {color:var(--accent);}.brand.svelte-1bojhsa em:where(.svelte-1bojhsa) {font-style:normal;font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-left:4px;}.views.svelte-1bojhsa {display:flex;gap:2px;}.views.svelte-1bojhsa button:where(.svelte-1bojhsa) {padding:7px 13px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-weight:600;font-size:0.9rem;transition:color 0.15s, background 0.15s;}.views.svelte-1bojhsa button:where(.svelte-1bojhsa):hover {color:var(--text);}.views.svelte-1bojhsa button.on:where(.svelte-1bojhsa) {background:var(--surface-2);color:var(--accent);}.spacer.svelte-1bojhsa {flex:1;}.icon.svelte-1bojhsa {position:relative;width:38px;height:38px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer;display:grid;place-items:center;}.mnav.svelte-1bojhsa {display:none;}\n  @media (max-width: 768px) {.views.svelte-1bojhsa, .topbar.svelte-1bojhsa .icon:where(.svelte-1bojhsa) {display:none;}.mnav.svelte-1bojhsa {display:block;position:fixed;right:16px;bottom:16px;z-index:60;}.fab.svelte-1bojhsa {width:52px;height:52px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--accent);font-size:1.6rem;cursor:pointer;box-shadow:var(--shadow-sm);}.mback.svelte-1bojhsa {position:fixed;inset:0;z-index:-1;background:rgba(0,0,0,.25);border:0;cursor:default;}.mpanel.svelte-1bojhsa svg:where(.svelte-1bojhsa) {width:30px;height:30px;}.mpanel.svelte-1bojhsa {display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;width:min(300px, calc(100vw - 32px));padding:10px;background:var(--surface);border:0;border-radius:var(--radius);box-shadow:0 6px 24px rgba(0,0,0,.4);}.mpanel.svelte-1bojhsa button:where(.svelte-1bojhsa) {display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 4px 10px;border:0;background:none;color:var(--text-muted);font-size:0.78rem;font-weight:600;cursor:pointer;border-radius:var(--radius);}.mpanel.svelte-1bojhsa button.on:where(.svelte-1bojhsa) {color:var(--accent);background:var(--surface-2);}.bar.svelte-1bojhsa {flex-wrap:wrap;gap:10px;}\n  }'
};

function Main($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$1);

	let view = state('home');

	let activeType = state(proxy({
		slug: 'anime',
		name: 'Anime',
		space: 'normal',
		media_type: 'anime',
		hidden: 0
	}));
	let listCounts = state(proxy({}));

	proxy({
		genres: [],
		format: [],
		status: [],
		yearMin: null,
		yearMax: null,
		dub: false,
		dubLang: '',
		seen: 'all',
		sort: 'popularity'
	});

	let meta = state(proxy({ formats: [], statuses: [], year_min: 1940, year_max: 2027 }));
	let items = state(proxy([]));
	let selected = state(null);
	let showSettings = state(false);
	let showPicker = state(false);
	let services = state(proxy([]));
	let health = state(proxy({}));
	let theme = state('light');
	let hToken = state(null);
	let hUnlocked = state(false);
	let hConfigured = state(false);

	user_effect(() => {
		hostEl().setAttribute('data-theme', get(theme));
	});

	function setTheme(t) {
		set(theme, t, true);

		try {
			localStorage.setItem('ol-theme', t);
		} catch {}
	}

	// Akzentfarbe (AniList „Profile Color") — '' = Theme-Default (Rot)
	let accent = state('');

	user_effect(() => {
		if (get(accent)) hostEl().style.setProperty('--accent', get(accent)); else hostEl().style.removeProperty('--accent');
	});

	function setAccent(c) {
		set(accent, c, true);

		try {
			localStorage.setItem('ol-accent', c);
		} catch {}
	}

	function refreshCounts() {
		api.profileStats().then((s) => set(listCounts, { all: s.total, ...s.by_status }, true)).catch(() => {});
	}

	user_effect(() => {
		try {
			const t = localStorage.getItem('ol-theme');

			if (t) set(theme, t, true);
		} catch {}

		try {
			const a = localStorage.getItem('ol-accent');

			if (a) set(accent, a, true);
		} catch {}

		api.health().then((s) => set(health, s, true)).catch(() => {});
		api.hStatus().then((s) => set(hConfigured, s.configured, true)).catch(() => {});

		api.activeMediaType().then((t) => {
			if (t && t.slug) set(activeType, t, true);
		}).catch(() => {});

		refreshCounts();
	});

	// Genres/Formate UND Dienste sind PRO CONFIG — neu laden bei Config-Wechsel (H bekommt eigene).
	user_effect(() => {
		const mt = get(activeType).media_type,
			sp = get(activeType).space;

		const tok = sp === 'h' ? get(hToken) : null;

		api.metaFilters({ space: sp, media_type: mt }, tok).then((m) => set(meta, m, true)).catch(() => {});
		api.services(mt).then((s) => set(services, s, true)).catch(() => {});
	});

	function selectType(cfg) {
		set(activeType, cfg, true);
		go('browse');
		api.setActiveMediaType(cfg.slug).catch(() => {});
		set(showPicker, false);
	}

	// Navigation + Browser-Zurück (History): Reiterwechsel/Detail legen einen History-Eintrag an.
	function go(v) {
		if (v === get(view)) {
			set(exploreAll, false);

			return;
		}

		set(view, v, true);

		try {
			history.pushState({ view: v }, '');
		} catch {}
	}

	function openDetail(m) {
		set(selected, m, true);

		try {
			history.pushState({ view: get(view), detail: m.id }, '');
		} catch {}
	}

	user_effect(() => {
		try {
			history.replaceState({ view: 'home' }, '');
		} catch {}

		const onPop = (e) => {
			if (get(showPicker)) {
				set(showPicker, false);

				return;
			}

			if (get(showSettings)) {
				set(showSettings, false);

				return;
			}

			if (get(selected)) {
				set(selected, null);

				return;
			}

			set(view, e.state && e.state.view || 'home', true);
		};

		window.addEventListener('popstate', onPop);

		return () => window.removeEventListener('popstate', onPop);
	});

	function onUnlocked(token) {
		set(hToken, token, true);
		set(hUnlocked, true);
	}

	function patchItem(m) {
		set(items, get(items).map((it) => it.id === m.id ? { ...it, ...m } : it), true);
		refreshCounts();
	}

	// AniList-Entdecken: ohne Suche/Filter zeigt „Entdecken" die Reihen (Trending/Beliebt/…), sonst das Raster.
	let menuOpen = state(false);

	function navTo(v) {
		set(menuOpen, false);
		go(v);
	}

	let exploreAll = state(false);

	var fragment = root_2$1();
	var header = first_child(fragment);
	var div = child(header);
	var button = child(div);
	var em = sibling(child(button), 3);
	var text = only_child(em);

	var nav = sibling(button, 2);
	var button_1 = child(nav);
	let classes;
	var text_1 = only_child(button_1, true);
	var button_2 = sibling(button_1, 2);
	let classes_1;
	var text_2 = only_child(button_2, true);
	var button_3 = sibling(button_2, 2);
	let classes_2;
	var text_3 = only_child(button_3, true);
	var button_4 = sibling(button_3, 2);
	let classes_3;
	var text_4 = only_child(button_4, true);
	var button_5 = sibling(button_4, 2);
	let classes_4;
	var text_5 = only_child(button_5, true);

	var button_6 = sibling(nav, 4);

	var div_1 = sibling(header, 2);
	var node_1 = child(div_1);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root$1();
			var button_7 = first_child(fragment_1);
			var div_2 = sibling(button_7, 2);
			var button_8 = child(div_2);
			let classes_5;
			var text_6 = sibling(child(button_8), 1, true);

			var button_9 = sibling(button_8, 2);
			let classes_6;
			var text_7 = sibling(child(button_9), 1, true);

			var button_10 = sibling(button_9, 2);
			let classes_7;
			var text_8 = sibling(child(button_10), 1, true);

			var button_11 = sibling(button_10, 2);
			let classes_8;
			var text_9 = sibling(child(button_11), 1, true);

			var button_12 = sibling(button_11, 2);
			let classes_9;
			var text_10 = sibling(child(button_12), 1, true);

			var button_13 = sibling(button_12, 2);

			template_effect(() => {
				classes_5 = set_class(button_8, 1, 'svelte-1bojhsa', null, classes_5, { on: get(view) === 'home' });
				set_text(text_6, t.nav.home);
				classes_6 = set_class(button_9, 1, 'svelte-1bojhsa', null, classes_6, { on: get(view) === 'browse' });
				set_text(text_7, t.nav.browse);
				classes_7 = set_class(button_10, 1, 'svelte-1bojhsa', null, classes_7, { on: get(view) === 'liste' });
				set_text(text_8, t.nav.list);
				classes_8 = set_class(button_11, 1, 'svelte-1bojhsa', null, classes_8, { on: get(view) === 'fav' });
				set_text(text_9, t.nav.favorites);
				classes_9 = set_class(button_12, 1, 'svelte-1bojhsa', null, classes_9, { on: get(view) === 'profil' });
				set_text(text_10, t.nav.profile);
			});

			delegated('click', button_7, () => set(menuOpen, false));
			delegated('click', button_8, () => navTo('home'));
			delegated('click', button_9, () => navTo('browse'));
			delegated('click', button_10, () => navTo('liste'));
			delegated('click', button_11, () => navTo('fav'));
			delegated('click', button_12, () => navTo('profil'));

			delegated('click', button_13, () => {
				set(menuOpen, false);
				set(showSettings, true);
			});

			append($$anchor, fragment_1);
		};

		var alternate = ($$anchor) => {
			var button_14 = root_1$1();

			delegated('click', button_14, () => set(menuOpen, true));
			append($$anchor, button_14);
		};

		if_block(node_1, ($$render) => {
			if (get(menuOpen)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_2 = sibling(div_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			Home($$anchor, {
				get api() {
					return api;
				},

				get activeType() {
					return get(activeType);
				},

				get hToken() {
					return get(hToken);
				},
				onopen: openDetail
			});
		};

		var consequent_2 = ($$anchor) => {
			AnimeList($$anchor, {
				get api() {
					return api;
				},

				get activeType() {
					return get(activeType);
				},

				get hToken() {
					return get(hToken);
				},
				onopen: openDetail
			});
		};

		var consequent_3 = ($$anchor) => {
			Favorites($$anchor, {
				get api() {
					return api;
				},

				get activeType() {
					return get(activeType);
				},

				get hToken() {
					return get(hToken);
				},
				onopen: openDetail
			});
		};

		var consequent_4 = ($$anchor) => {
			Stats($$anchor, {
				get api() {
					return api;
				}
			});
		};

		var alternate_1 = ($$anchor) => {
			Browse($$anchor, {
				get api() {
					return api;
				},

				get activeType() {
					return get(activeType);
				},

				get hToken() {
					return get(hToken);
				},
				onopen: openDetail
			});
		};

		if_block(node_2, ($$render) => {
			if (get(view) === 'home') $$render(consequent_1); else if (get(view) === 'liste') $$render(consequent_2, 1); else if (get(view) === 'fav') $$render(consequent_3, 2); else if (get(view) === 'profil') $$render(consequent_4, 3); else $$render(alternate_1, -1);
		});
	}

	var node_3 = sibling(node_2, 2);

	{
		var consequent_5 = ($$anchor) => {
			Detail($$anchor, {
				get media() {
					return get(selected);
				},

				get services() {
					return get(services);
				},
				onclose: () => set(selected, null),
				onchange: patchItem
			});
		};

		if_block(node_3, ($$render) => {
			if (get(selected)) $$render(consequent_5);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_6 = ($$anchor) => {
			Settings($$anchor, {
				get theme() {
					return get(theme);
				},
				setTheme,
				get accent() {
					return get(accent);
				},
				setAccent,
				get services() {
					return get(services);
				},

				get activeConfig() {
					return get(activeType).media_type;
				},

				get configName() {
					return get(activeType).name;
				},

				get stats() {
					return get(health);
				},

				get hConfigured() {
					return get(hConfigured);
				},
				onUnlocked,
				onOpenPicker: () => {
					set(showSettings, false);
					set(showPicker, true);
				},
				onclose: () => set(showSettings, false)
			});
		};

		if_block(node_4, ($$render) => {
			if (get(showSettings)) $$render(consequent_6);
		});
	}

	var node_5 = sibling(node_4, 2);

	{
		var consequent_7 = ($$anchor) => {
			MediaTypePicker($$anchor, {
				get hConfigured() {
					return get(hConfigured);
				},

				get startUnlocked() {
					return get(hUnlocked);
				},

				get hToken() {
					return get(hToken);
				},
				onUnlockH: (t) => onUnlocked(t),
				onpick: (t) => selectType(t),
				onclose: () => set(showPicker, false)
			});
		};

		if_block(node_5, ($$render) => {
			if (get(showPicker)) $$render(consequent_7);
		});
	}

	template_effect(() => {
		set_text(text, `${get(activeType).name ?? ''} ▾`);
		classes = set_class(button_1, 1, 'svelte-1bojhsa', null, classes, { on: get(view) === 'home' });
		set_text(text_1, t.nav.home);
		classes_1 = set_class(button_2, 1, 'svelte-1bojhsa', null, classes_1, { on: get(view) === 'browse' });
		set_text(text_2, t.nav.browse);
		classes_2 = set_class(button_3, 1, 'svelte-1bojhsa', null, classes_2, { on: get(view) === 'liste' });
		set_text(text_3, t.nav.list);
		classes_3 = set_class(button_4, 1, 'svelte-1bojhsa', null, classes_3, { on: get(view) === 'fav' });
		set_text(text_4, t.nav.favorites);
		classes_4 = set_class(button_5, 1, 'svelte-1bojhsa', null, classes_4, { on: get(view) === 'profil' });
		set_text(text_5, t.nav.profile);
	});

	delegated('click', button, () => set(showPicker, true));
	delegated('click', button_1, () => go('home'));
	delegated('click', button_2, () => go('browse'));
	delegated('click', button_3, () => go('liste'));
	delegated('click', button_4, () => go('fav'));
	delegated('click', button_5, () => go('profil'));
	delegated('click', button_6, () => set(showSettings, true));
	append($$anchor, fragment);
	pop();
}

delegate(['click']);

var root = from_html(`<p class="lead svelte-111n8q1">Die Anime-Liste braucht ein Backend (deine eigene Datenbank). Trage dessen Adresse und das Passwort ein.</p> <label for="srv" class="svelte-111n8q1">Adresse mit Port</label> <input id="srv" placeholder="192.168.1.20:8787" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="url" class="svelte-111n8q1"/>`, 1);
var root_1 = from_html(`<p class="lead svelte-111n8q1">Dieses Backend ist passwortgeschützt.</p>`);
var root_2 = from_html(`<p class="err svelte-111n8q1"> </p>`);
var root_3 = from_html(`<p class="hint svelte-111n8q1">Noch kein Backend? Anleitung zum Selbst-Installieren: github.com/Entwicklerfuchs26/orbitlist</p>`);
var root_4 = from_html(`<div class="cwrap svelte-111n8q1"><form class="card svelte-111n8q1"><h1 class="svelte-111n8q1">Orbitlist verbinden</h1> <!> <label for="pw" class="svelte-111n8q1">Passwort</label> <input id="pw" type="password" placeholder="Passwort des Backends" autocomplete="current-password" class="svelte-111n8q1"/> <!> <button class="go svelte-111n8q1"> </button> <!></form></div>`);

const $$css = {
	hash: 'svelte-111n8q1',
	code: '.cwrap.svelte-111n8q1 {position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:var(--bg, #111);overflow:auto;}.card.svelte-111n8q1 {width:min(420px, 100%);display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow-sm);}h1.svelte-111n8q1 {margin:0 0 4px;font-size:1.25rem;color:var(--text);}.lead.svelte-111n8q1, .hint.svelte-111n8q1 {margin:0 0 8px;color:var(--text-muted);font-size:0.88rem;line-height:1.4;}label.svelte-111n8q1 {font-size:0.8rem;color:var(--text-muted);margin-top:6px;}input.svelte-111n8q1 {padding:11px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg, transparent);color:var(--text);font-size:1rem;outline:none;}input.svelte-111n8q1:focus {border-color:var(--accent);}.err.svelte-111n8q1 {margin:6px 0 0;color:#e85d75;font-size:0.86rem;}.go.svelte-111n8q1 {margin-top:12px;padding:12px;border:0;border-radius:var(--radius-sm);background:var(--accent);color:#022;font-weight:700;font-size:1rem;cursor:pointer;}.go.svelte-111n8q1:disabled {opacity:0.6;cursor:default;}'
};

function Connect($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css);

	let server = state(proxy(conn.server || conn.defaultServer));
	let password = state('');
	let busy = state(false);
	let error = state(proxy(conn.message));
	const plugin = conn.mode === 'plugin';

	async function submit(e) {
		e.preventDefault();
		set(busy, true);
		set(error, '');

		try {
			await tryConnect(get(server), get(password));
		} catch(err) {
			set(error, err.message || String(err), true);
		}

		set(busy, false);
	}

	var div = root_4();
	var form = child(div);
	var node = sibling(child(form), 2);

	{
		var consequent = ($$anchor) => {
			var fragment = root();
			var input = sibling(first_child(fragment), 4);
			bind_value(input, () => get(server), ($$value) => set(server, $$value));
			append($$anchor, fragment);
		};

		var alternate = ($$anchor) => {
			var p = root_1();

			append($$anchor, p);
		};

		if_block(node, ($$render) => {
			if (plugin) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var input_1 = sibling(node, 4);

	var node_1 = sibling(input_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var p_1 = root_2();
			var text = only_child(p_1, true);

			template_effect(() => set_text(text, get(error) || conn.message));
			append($$anchor, p_1);
		};

		if_block(node_1, ($$render) => {
			if (get(error) || conn.message) $$render(consequent_1);
		});
	}

	var button = sibling(node_1, 2);
	var text_1 = only_child(button, true);
	var node_2 = sibling(button, 2);

	{
		var consequent_2 = ($$anchor) => {
			var p_2 = root_3();

			append($$anchor, p_2);
		};

		if_block(node_2, ($$render) => {
			if (plugin) $$render(consequent_2);
		});
	}

	template_effect(() => {
		button.disabled = get(busy);
		set_text(text_1, get(busy) ? 'Verbinde …' : 'Verbinden');
	});

	event('submit', form, submit);
	bind_value(input_1, () => get(password), ($$value) => set(password, $$value));
	append($$anchor, div);
	pop();
}

function App($$anchor, $$props) {
	push($$props, false);
	init();

	var fragment = comment();
	var node = first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Connect($$anchor, {});
		};

		var alternate = ($$anchor) => {
			var fragment_2 = comment();
			var node_1 = first_child(fragment_2);

			key(node_1, () => conn.rev, ($$anchor) => {
				Main($$anchor, {});
			});

			append($$anchor, fragment_2);
		};

		if_block(node, ($$render) => {
			if (conn.needsSetup) $$render(consequent); else $$render(alternate, -1);
		});
	}

	append($$anchor, fragment);
	pop();
}

const themeCss = "/* Orbitlist-Theme — exakt an AniList angelehnt (Tokens live aus anilist.co ausgelesen 2026-11-01).\n   Standard = AniList-Hell (Default der Seite). Dunkel = AniList-Nachtmodus via data-theme='dark'. */\n.ol-root {\n  --accent: #e8503a;          /* Jonas' AniList = Rot (Profile Color). Überschreibbar per Farbwähler. */\n  --accent-2: #8b5cf6;        /* weicher Violett-Akzent (H / Verläufe) */\n  --accent-dim: color-mix(in srgb, var(--accent) 78%, #000);  /* folgt dem Akzent automatisch */\n  --on-accent: #fff;          /* Textfarbe auf Akzent-Flächen (hell+dunkel gleich) */\n  --good: #7bd555;            /* AniList green 123,213,85 (Scores) */\n  --warn: #f7a60c;\n  --bad: #e85d75;            /* AniList red 232,93,117 */\n  --gold: #f7c948;           /* eigene Wertung (Stern-Badge) */\n  --radius: 4px;             /* AniList nutzt durchgehend 4px */\n  --radius-sm: 3px;\n  --maxw: 1140px;            /* AniList .container */\n  --pad: 50px;               /* AniList Seiten-Padding */\n\n  /* Hell (AniList-Default) */\n  --bg: #edf1f5;             /* 237,241,245 */\n  --surface: #fafafa;        /* 250,250,250 Karten/Widgets */\n  --surface-2: #ebeef2;      /* Insets / grey-dark */\n  --surface-3: #f6f8fb;      /* foreground-blue */\n  --border: #e2e7ee;\n  --text: #5c728a;           /* 92,114,138 Haupttext */\n  --text-strong: #44515f;    /* Überschriften */\n  --text-muted: #8c99a8;     /* 146,153,161 */\n  --nav: #fafafa;\n  --shadow: 0 6px 12px rgba(49, 54, 68, 0.12);\n  --shadow-sm: 0 2px 5px rgba(49, 54, 68, 0.1);\n}\n.ol-root[data-theme='dark'] {\n  /* Dunkel (AniList-Nachtmodus) */\n  --bg: #0b1622;             /* 11,22,34 */\n  --surface: #151f2e;        /* 21,31,46 */\n  --surface-2: #1f2b3d;\n  --surface-3: #16202e;\n  --border: #273449;\n  --text: #9fadbd;           /* AniList dark Haupttext */\n  --text-strong: #e6edf5;\n  --text-muted: #6f7d8d;\n  --nav: #151f2e;\n  --shadow: 0 10px 30px rgba(0, 0, 0, 0.45);\n  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.35);\n}\n/* Alles auf .ol-root begrenzt, damit das Plugin das Orbit-Host-Layout nicht beeinflusst. */\n.ol-root, .ol-root * { box-sizing: border-box; }\n.ol-root {\n  background: var(--bg);\n  color: var(--text);\n  font-family: 'Overpass', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, sans-serif;\n  font-size: 16px;\n  -webkit-font-smoothing: antialiased;\n  min-height: 100%;\n}\n.ol-root a { color: var(--accent); text-decoration: none; }\n.ol-root ::-webkit-scrollbar { width: 10px; height: 10px; }\n.ol-root ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }\n.ol-root ::-webkit-scrollbar-track { background: transparent; }\n.ol-root button { font-family: inherit; }\n";

const http = async (url, init) => {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({
      url,
      method: init.method || "GET",
      headers: init.headers,
      data: init.body ? JSON.parse(init.body) : void 0,
      connectTimeout: 8e3,
      readTimeout: 6e4
    });
    const asText = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
    return { status: r.status, json: async () => typeof r.data === "string" ? JSON.parse(r.data) : r.data, text: async () => asText };
  }
  return fetch(url, init);
};
function makePlugin(id, name, opts = {}) {
  class AnimeView extends View {
    getViewType() {
      return id;
    }
    getDisplayName() {
      return name;
    }
    getIcon() {
      return "film";
    }
    onOpen() {
      requestAnimationFrame(() => {
        const box = document.createElement("div");
        box.className = "ol-root";
        box.style.cssText = "height:100%;overflow:auto";
        this.containerEl.appendChild(box);
        const style = document.createElement("style");
        style.textContent = themeCss;
        document.head.appendChild(style);
        this.box = box;
        this.style = style;
        setHost(box);
        configure({ defaultServer: opts.defaultServer, http, storageKey: `orbitlist.conn.${id}` });
        this.component = mount(App, { target: box });
      });
    }
    onClose() {
      if (this.component) unmount(this.component);
      this.box?.remove();
      this.style?.remove();
      setHost(null);
    }
  }
  return class extends Plugin {
    onload() {
      this.registerView(id, () => new AnimeView(this.app));
      this.addNavigationItem({ id, name, icon: "film" });
      this.addCommand({ id: `${id}:open`, name: `${name} öffnen`, callback: () => this.app.workspace?.openView?.(id) });
    }
  };
}

const manifest = {
  id: "anime-liste-animus",
  name: "Anime-Liste · Animus (Test)",
  version: "0.1.0",
  description: "Anime-Tracker, vorverbunden mit dem Heim-Backend auf Animus (Adresse vorbelegt, nur das Passwort eingeben). Braucht den WireGuard-Tunnel.",
  author: "Entwicklerfuchs",
  main: "main.js",
  type: "gui",
  platforms: ["desktop", "mobile", "web"]
};
const animeListeAnimus = makePlugin(manifest.id, "Anime-Liste · Animus", { defaultServer: "10.10.0.2:8787" });

export { animeListeAnimus as default, manifest };
