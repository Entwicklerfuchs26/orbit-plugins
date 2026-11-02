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
			parts = [];

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

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	if (component_context === null) {
		lifecycle_outside_component();
	}

	onMount(() => () => untrack(fn));
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

/* conn.svelte.ts generated by Svelte v5.57.3 */

let LS$1 = "orbitlist.conn";

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
	if (o.storageKey) LS$1 = o.storageKey;
	if (o.http) transport = o.http;
	if (o.plugin) conn.mode = "plugin";
	if (o.embedded) conn.mode = "embedded";
	if (o.defaultServer) conn.defaultServer = o.defaultServer;

	try {
		const s = JSON.parse(localStorage.getItem(LS$1) || "{}");

		conn.server = s.server || "";
		conn.key = s.key || "";
	} catch {}

	if (conn.mode === "plugin" && !conn.server) conn.needsSetup = true;
	if (conn.mode === "embedded") conn.needsSetup = false;
}

function save() {
	try {
		localStorage.setItem(LS$1, JSON.stringify({ server: conn.server, key: conn.key }));
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
async function importUserData(file) {
  const r = await request("/import", { method: "POST", headers: { "content-type": "text/plain" }, body: await file.text() });
  const d = await r.json().catch(() => ({}));
  if (r.status !== 200) throw new Error(d.detail || `Import fehlgeschlagen (${r.status})`);
  return d;
}
const api = {
  health: () => j("/health"),
  stats: () => j("/stats"),
  anime: (q = {}) => j("/anime" + qs(q)),
  get: (id) => j("/anime/" + id),
  patchEntry: async (id, patch) => {
    const r = await j(`/media/${id}/entry`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if ("watch_status" in patch || "progress" in patch) Promise.resolve().then(() => streaming).then((x) => x.refreshStreaming(id)).catch(() => {
    });
    return r;
  },
  streamingOf: (id) => j(`/media/${id}/streaming`),
  putStreaming: (id, items) => j(`/media/${id}/streaming`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) }),
  putScores: (items) => j("/scores", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) }),
  streamingMap: (ids) => j("/streaming" + qs({ ids: ids.join(",") })),
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

const ENDPOINT = "https://graphql.anilist.co";
const fetchHttp = async (url, init) => {
  const r = await fetch(url, init);
  const headers = {};
  r.headers.forEach((v, k) => headers[k.toLowerCase()] = v);
  return { status: r.status, json: () => r.json(), text: () => r.text(), headers };
};
const makeNative = () => {
  try {
    const cap = globalThis.Capacitor;
    const plug = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null;
    if (!plug) return null;
    return async (url, init) => {
      const r = await plug.request({
        url,
        method: init.method || "GET",
        headers: init.headers,
        data: init.body ? JSON.parse(init.body) : void 0,
        connectTimeout: 8e3,
        readTimeout: 2e4
      });
      const headers = {};
      for (const [k, v] of Object.entries(r.headers || {})) headers[k.toLowerCase()] = String(v);
      return { status: r.status, json: async () => typeof r.data === "string" ? JSON.parse(r.data) : r.data, text: async () => typeof r.data === "string" ? r.data : JSON.stringify(r.data), headers };
    };
  } catch {
    return null;
  }
};
let nativeHttp;
const http$1 = () => {
  if (nativeHttp === void 0) nativeHttp = makeNative();
  return nativeHttp || fetchHttp;
};
const TTL_LIGHT = 7 * 864e5;
const TTL_DETAIL = 3 * 864e5;
const IDB_NAME = "orbitlist-anilist";
const mem = /* @__PURE__ */ new Map();
let dbp = null;
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      if (typeof indexedDB === "undefined") return res(null);
      const rq = indexedDB.open(IDB_NAME, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("kv", { keyPath: "k" });
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbp;
}
async function cacheGet(k) {
  const hit = mem.get(k);
  if (hit) return hit;
  const db = await openDb();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const rq = db.transaction("kv").objectStore("kv").get(k);
      rq.onsuccess = () => {
        const r = rq.result;
        if (r) mem.set(k, r);
        res(r || null);
      };
      rq.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}
async function cachePut(k, v) {
  const row = { k, at: Date.now(), v };
  mem.set(k, row);
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction("kv", "readwrite").objectStore("kv").put(row);
  } catch {
  }
}
let gapMs = 2200;
let blockedUntil = 0;
let lastAt = 0;
let chain = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function gql(query, variables) {
  const run = async () => {
    if (blockedUntil - Date.now() > 15e3) throw Object.assign(new Error("AniList: Anfragelimit erreicht"), { status: 429 });
    const wait = Math.max(blockedUntil, lastAt + gapMs) - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    const r = await http$1()(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables })
    });
    const lim = Number(r.headers?.["x-ratelimit-limit"]);
    if (lim > 0) gapMs = Math.max(700, Math.ceil(6e4 / lim) + 200);
    if (r.status === 429) {
      const ra = Number(r.headers?.["retry-after"]);
      blockedUntil = Date.now() + (ra > 0 ? ra * 1e3 : 6e4);
      throw Object.assign(new Error("AniList: Anfragelimit erreicht"), { status: 429 });
    }
    if (r.status < 200 || r.status >= 300) throw Object.assign(new Error(`AniList: Status ${r.status}`), { status: r.status });
    const d = await r.json();
    if (d?.errors?.length && !d.data) throw new Error("AniList: " + (d.errors[0]?.message || "Fehler"));
    return d.data;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {
  });
  return p;
}
const Q_LIGHT = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id averageScore popularity bannerImage coverImage{large color}}}}`;
function toLight(m) {
  return {
    id: m.id,
    cover: m.coverImage?.large || void 0,
    banner: m.bannerImage || void 0,
    color: hex(m.coverImage?.color),
    score: m.averageScore ?? void 0,
    popularity: m.popularity ?? void 0
  };
}
async function cachedLight(id) {
  const r = await cacheGet("l:" + id);
  return r ? { v: r.v, fresh: Date.now() - r.at < TTL_LIGHT } : null;
}
const failedUntil = /* @__PURE__ */ new Map();
let lightWaiters = /* @__PURE__ */ new Map();
let flushTimer = null;
async function getLight(id) {
  if (!id || !Number.isFinite(id)) return null;
  const c = await cachedLight(id);
  if (c?.fresh) return c.v;
  if ((failedUntil.get(id) || 0) > Date.now()) return c?.v ?? null;
  return new Promise((res) => {
    const l = lightWaiters.get(id);
    const done = (v) => res(v ?? c?.v ?? null);
    if (l) l.push(done);
    else lightWaiters.set(id, [done]);
    if (!flushTimer) flushTimer = setTimeout(flushLight, 80);
  });
}
async function flushLight() {
  flushTimer = null;
  const waiters = lightWaiters;
  lightWaiters = /* @__PURE__ */ new Map();
  const ids = [...waiters.keys()];
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50);
    let got = /* @__PURE__ */ new Map();
    try {
      const d = await gql(Q_LIGHT, { ids: part, n: part.length });
      for (const m of d?.Page?.media || []) got.set(m.id, toLight(m));
      for (const id of part) {
        const v = got.get(id);
        if (v) await cachePut("l:" + id, v);
        else failedUntil.set(id, Date.now() + 6 * 36e5);
      }
    } catch (e) {
      const back = e?.status === 429 ? Math.max(3e4, blockedUntil - Date.now()) : 6e4;
      for (const id of part) failedUntil.set(id, Date.now() + back);
    }
    for (const id of part) for (const w of waiters.get(id) || []) w(got.get(id) ?? null);
  }
}
const Q_DETAIL = `query($id:Int){Media(id:$id,type:ANIME){id description(asHtml:false)
nextAiringEpisode{episode airingAt}
externalLinks{site url type language color icon isDisabled}
stats{statusDistribution{status amount} scoreDistribution{score amount}}
characters(sort:[ROLE,RELEVANCE,ID],perPage:24){edges{role node{id name{userPreferred} image{medium}} voiceActors(language:JAPANESE,sort:RELEVANCE){id languageV2 name{userPreferred} image{medium}}}}
staff(sort:RELEVANCE,perPage:24){edges{role node{id name{userPreferred} image{medium}}}}
relations{edges{relationType(version:2) node{id type format status title{userPreferred} coverImage{large} averageScore}}}
recommendations(sort:RATING_DESC,perPage:12){nodes{rating mediaRecommendation{id type format averageScore title{userPreferred} coverImage{large}}}}}}`;
const hex = (c) => typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c) ? c : void 0;
const person = (n) => ({ id: n.id, name: n.name?.userPreferred || "?", image: n.image?.medium || void 0 });
const mref = (n) => ({
  id: n.id,
  title: n.title?.userPreferred || "?",
  cover: n.coverImage?.large || void 0,
  format: n.format || void 0,
  type: n.type || void 0,
  status: n.status || void 0,
  score: n.averageScore ?? void 0
});
function toDetail(m) {
  return {
    id: m.id,
    description: m.description || void 0,
    nextAiring: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt } : void 0,
    characters: (m.characters?.edges || []).map((e) => ({
      role: e.role,
      char: person(e.node),
      actors: (e.voiceActors || []).map((a) => ({ ...person(a), lang: a.languageV2 || void 0 }))
    })),
    staff: (m.staff?.edges || []).map((e) => ({ role: e.role || "", person: person(e.node) })),
    statusDist: m.stats?.statusDistribution || [],
    scoreDist: m.stats?.scoreDistribution || [],
    relations: (m.relations?.edges || []).map((e) => ({ ...mref(e.node), relation: e.relationType })),
    recommendations: (m.recommendations?.nodes || []).filter((n) => n.mediaRecommendation).map((n) => ({ ...mref(n.mediaRecommendation), rating: n.rating ?? 0 })),
    streaming: streamingFrom(m.externalLinks || [])
  };
}
function streamingFrom(links) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const l of links) {
    if (l?.type !== "STREAMING" || l.isDisabled || !/^https?:\/\//i.test(l.url || "")) continue;
    const key = (l.site || "") + "|" + (l.language || "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ site: l.site, url: l.url, color: hex(l.color), icon: l.icon || void 0, language: l.language || void 0 });
  }
  return out;
}
const inflight = /* @__PURE__ */ new Map();
function getDetail(id) {
  if (!id || !Number.isFinite(id)) return Promise.resolve(null);
  let p = inflight.get(id);
  if (p) return p;
  p = (async () => {
    const c = await cacheGet("d:" + id);
    if (c && Date.now() - c.at < TTL_DETAIL) return c.v;
    try {
      const d = await gql(Q_DETAIL, { id });
      if (!d?.Media) return c?.v ?? null;
      const v = toDetail(d.Media);
      await cachePut("d:" + id, v);
      return v;
    } catch {
      return c?.v ?? null;
    }
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}
const Q_AIRING = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id nextAiringEpisode{episode airingAt}}}}`;
async function getAiring(ids) {
  const list = [...new Set(ids.filter((x) => !!x && Number.isFinite(x)))].slice(0, 50);
  const out = [];
  const need = [];
  for (const id of list) {
    const c = await cacheGet("a:" + id);
    if (c && Date.now() - c.at < 36e5) {
      if (c.v) out.push(c.v);
    } else need.push(id);
  }
  if (need.length) {
    try {
      const d = await gql(Q_AIRING, { ids: need, n: need.length });
      const got = /* @__PURE__ */ new Map();
      for (const m of d?.Page?.media || []) if (m.nextAiringEpisode) got.set(m.id, { id: m.id, episode: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt });
      for (const id of need) {
        const v = got.get(id) ?? null;
        await cachePut("a:" + id, v);
        if (v) out.push(v);
      }
    } catch {
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
const Q_CREDITS = `query($ids:[Int],$n:Int){Page(perPage:$n){media(id_in:$ids,type:ANIME){id
staff(sort:RELEVANCE,perPage:15){edges{role node{id name{userPreferred} image{medium}}}}
characters(sort:[ROLE,RELEVANCE],perPage:12){edges{node{id} voiceActors(language:JAPANESE,sort:RELEVANCE){id name{userPreferred} image{medium}}}}}}}`;
async function getCredits(ids, onProgress) {
  const list = [...new Set(ids.filter((x) => !!x && Number.isFinite(x)))];
  const out = [];
  const need = [];
  for (const id of list) {
    const c = await cacheGet("s:" + id);
    if (c && Date.now() - c.at < TTL_LIGHT) out.push(c.v);
    else need.push(id);
  }
  let done = list.length - need.length;
  onProgress?.(done, list.length);
  for (let i = 0; i < need.length; i += 10) {
    const part = need.slice(i, i + 10);
    try {
      const d = await gql(Q_CREDITS, { ids: part, n: part.length });
      for (const m of d?.Page?.media || []) {
        const seen = /* @__PURE__ */ new Set();
        const actors = [];
        for (const e of m.characters?.edges || []) for (const a of e.voiceActors || []) if (!seen.has(a.id)) {
          seen.add(a.id);
          actors.push(person(a));
        }
        const v = { id: m.id, staff: (m.staff?.edges || []).map((e) => ({ role: e.role || "", person: person(e.node) })), actors };
        await cachePut("s:" + m.id, v);
        out.push(v);
      }
    } catch (e) {
      if (e?.status === 429) break;
    }
    done += part.length;
    onProgress?.(Math.min(done, list.length), list.length);
  }
  return out;
}
function safeHtml(s) {
  if (!s) return "";
  const esc = s.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(/&lt;(\/?)(br|i|b|em|strong|p)\s*\/?&gt;/gi, (_m, close, tag) => `<${close}${tag.toLowerCase()}>`);
}

/* anilist.svelte.ts generated by Svelte v5.57.3 */

const store = proxy({});
const asked = new Set();

function lightOf(id) {
	return id ? store[id] : void 0;
}

let pending = [];
let flushT = null;

function queueScore(id, score) {
	if (!score) return;

	pending.push({ anilist_id: id, score });
	clearTimeout(flushT);

	flushT = setTimeout(
		() => {
			const batch = pending.splice(0, 500);

			if (batch.length) api.putScores(batch).catch(() => {});
		},
		2e3
	);
}

function want(id) {
	if (!id || asked.has(id)) return;

	asked.add(id);

	cachedLight(id).then((c) => {
		if (c) store[id] = c.v;
	});

	getLight(id).then((v) => {
		if (v) {
			store[id] = v;
			queueScore(id, v.score);
		}
	}).catch(() => {});
}

function visible(node, id) {
	if (!id) return {};

	if (typeof IntersectionObserver === "undefined") {
		want(id);

		return {};
	}

	let cur = id;

	const io = new IntersectionObserver(
		(es) => {
			if (es.some((e) => e.isIntersecting)) {
				want(cur);
				io.disconnect();
			}
		},
		{ rootMargin: "200px" }
	);

	io.observe(node);

	return {
		update(n) {
			if (n && n !== cur) {
				cur = n;
				io.observe(node);
			}
		},

		destroy() {
			io.disconnect();
		}
	};
}

var root$d = from_html(`<img alt="" class="svelte-1470o3e"/>`);
var root_1$d = from_html(`<div class="ph svelte-1470o3e"> </div>`);
var root_2$d = from_html(`<div class="c svelte-1470o3e"><!></div>`);

const $$css$d = {
	hash: 'svelte-1470o3e',
	code: '.c.svelte-1470o3e {position:absolute;inset:0;}img.svelte-1470o3e {width:100%;height:100%;object-fit:cover;display:block;transition:filter 0.18s ease;}.ph.svelte-1470o3e {width:100%;height:100%;display:grid;place-items:center;font-size:2rem;font-weight:600;color:var(--text-muted);}'
};

function Cover($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$d);

	// Cover mit Platzhalter: nimmt cover_url aus dem Katalog/Backend, sonst das Bild von AniList
	// (Laufzeit-Abruf, sobald das Element sichtbar ist).
	let lazy = prop($$props, 'lazy', 3, true);

	const art = user_derived(() => lightOf($$props.media.anilist_id));
	const src = user_derived(() => $$props.media.cover_url || get(art)?.cover);
	const bg = user_derived(() => $$props.media.color || get(art)?.color);
	var div = root_2$d();
	var node = child(div);

	{
		var consequent = ($$anchor) => {
			var img = root$d();

			template_effect(() => {
				set_attribute(img, 'src', get(src));
				set_attribute(img, 'loading', lazy() ? 'lazy' : 'eager');
			});

			event('error', img, (e) => e.currentTarget.style.display = 'none');
			append($$anchor, img);
		};

		var alternate = ($$anchor) => {
			var div_1 = root_1$d();
			var text = only_child(div_1, true);

			template_effect(() => set_text(text, $$props.media.title?.[0] ?? '?'));
			append($$anchor, div_1);
		};

		if_block(node, ($$render) => {
			if (get(src)) $$render(consequent); else $$render(alternate, -1);
		});
	}
	action(div, ($$node, $$action_arg) => visible?.($$node, $$action_arg), () => $$props.media.cover_url ? null : $$props.media.anilist_id);
	template_effect(() => set_style(div, !get(src) && get(bg) ? `background:${get(bg)}22` : ''));
	append($$anchor, div);
	pop();
}

var root$c = from_html(`<span class="badge dub svelte-2gevwt" title="Deutscher Dub vorhanden">DE</span>`);
var root_1$c = from_html(`<span class="badge rat svelte-2gevwt" title="Deine Wertung"> </span>`);
var root_2$c = from_html(`<span class="badge own svelte-2gevwt" title="Im Regal">▣</span>`);
var root_3$a = from_html(`<span class="badge score svelte-2gevwt" title="Durchschnitts-Wertung (AniList)"> </span>`);
var root_4$a = from_html(`<span> </span>`);
var root_5$8 = from_html(`<span class="score-txt svelte-2gevwt"> </span>`);
var root_6$8 = from_html(`<div class="genres svelte-2gevwt"> </div>`);
var root_7$8 = from_html(`<button><div class="cover svelte-2gevwt"><!> <!> <!> <!> <!></div> <div class="meta svelte-2gevwt"><div class="title svelte-2gevwt"> </div> <div class="sub svelte-2gevwt"><!> <!> <!></div> <!></div></button>`);

const $$css$c = {
	hash: 'svelte-2gevwt',
	code: '.card.svelte-2gevwt {display:flex;flex-direction:column;gap:8px;padding:0;border:0;background:none;color:inherit;text-align:left;cursor:pointer;}.cover.svelte-2gevwt {position:relative;aspect-ratio:185 / 265;   /* AniList-Cover ~0.70 */border-radius:var(--radius);overflow:hidden;background:var(--surface); /* Platzhalter-Fläche */box-shadow:var(--shadow-sm);transition:transform 0.18s ease, box-shadow 0.18s ease;}.card.svelte-2gevwt:hover .cover:where(.svelte-2gevwt) {transform:translateY(-2px);box-shadow:var(--shadow);}.badge.svelte-2gevwt {position:absolute;font-size:0.72rem;font-weight:700;line-height:1;padding:3px 6px;border-radius:var(--radius-sm);backdrop-filter:blur(4px);}.dub.svelte-2gevwt {top:6px;left:6px;background:var(--accent);color:var(--on-accent);}.rat.svelte-2gevwt {top:6px;right:6px;background:rgba(0, 0, 0, 0.6);color:var(--gold);}.own.svelte-2gevwt {top:6px;left:6px;background:var(--good);color:#04240f;}\n  /* Score grün unten links, wie AniLists Wertungs-Badge */.score.svelte-2gevwt {bottom:6px;left:6px;background:rgba(0, 0, 0, 0.6);color:var(--good);font-weight:600;}\n  /* own + dub liegen beide links oben → dub nach rechts rutschen, falls beides */.card.svelte-2gevwt:has(.own:where(.svelte-2gevwt)) .dub:where(.svelte-2gevwt) {left:auto;right:6px;}.title.svelte-2gevwt {font-size:0.85rem;font-weight:500;line-height:1.3;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color 0.15s ease;}.card.svelte-2gevwt:hover .title:where(.svelte-2gevwt) {color:var(--accent);}.sub.svelte-2gevwt {display:flex;gap:8px;margin-top:1px;font-size:0.72rem;color:var(--text-muted);}.score-txt.svelte-2gevwt {color:var(--good);}.genres.svelte-2gevwt {font-size:0.72rem;color:var(--text-muted);margin-top:2px;}\n\n  /* Listen-Ansicht: kompakte Zeile wie AniLists Listenzeile */.card.list.svelte-2gevwt {flex-direction:row;align-items:center;gap:12px;padding:6px 8px;border-radius:var(--radius);transition:background 0.15s ease;}.card.list.svelte-2gevwt:hover {background:var(--surface-2);}.card.list.svelte-2gevwt .cover:where(.svelte-2gevwt) {width:48px;aspect-ratio:185 / 265;flex:0 0 auto;border-radius:var(--radius-sm);box-shadow:none;}.card.list.svelte-2gevwt:hover .cover:where(.svelte-2gevwt) {transform:none;box-shadow:none;}.card.list.svelte-2gevwt .meta:where(.svelte-2gevwt) {min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px;}.card.list.svelte-2gevwt .title:where(.svelte-2gevwt) {-webkit-line-clamp:1;font-weight:500;}\n  /* Score-Badge auf dem Mini-Cover wäre zu eng → in der Zeile nur als Text */.card.list.svelte-2gevwt .cover:where(.svelte-2gevwt) .score:where(.svelte-2gevwt) {display:none;}'
};

function Card($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$c);

	let list = prop($$props, 'list', 3, false);

	// Wertung aus AniList (Laufzeit), falls der Katalog keine hat
	const score = user_derived(() => $$props.media.average_score ?? lightOf($$props.media.anilist_id)?.score);

	var button = root_7$8();
	let classes;
	var div = child(button);
	var node = child(div);

	Cover(node, {
		get media() {
			return $$props.media;
		}
	});

	var node_1 = sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			var span = root$c();

			append($$anchor, span);
		};

		if_block(node_1, ($$render) => {
			if ($$props.media.dub_de) $$render(consequent);
		});
	}

	var node_2 = sibling(node_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var span_1 = root_1$c();
			var text = only_child(span_1);

			template_effect(() => set_text(text, `★ ${$$props.media.rating ?? ''}`));
			append($$anchor, span_1);
		};

		if_block(node_2, ($$render) => {
			if ($$props.media.rating) $$render(consequent_1);
		});
	}

	var node_3 = sibling(node_2, 2);

	{
		var consequent_2 = ($$anchor) => {
			var span_2 = root_2$c();

			append($$anchor, span_2);
		};

		if_block(node_3, ($$render) => {
			if ($$props.media.collection === 'owned') $$render(consequent_2);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_3 = ($$anchor) => {
			var span_3 = root_3$a();
			var text_1 = only_child(span_3);

			template_effect(() => set_text(text_1, `${get(score) ?? ''}%`));
			append($$anchor, span_3);
		};

		if_block(node_4, ($$render) => {
			if (get(score)) $$render(consequent_3);
		});
	}

	var div_1 = sibling(div, 2);
	var div_2 = child(div_1);
	var text_2 = only_child(div_2, true);
	var div_3 = sibling(div_2, 2);
	var node_5 = child(div_3);

	{
		var consequent_4 = ($$anchor) => {
			var span_4 = root_4$a();
			var text_3 = only_child(span_4, true);

			template_effect(() => set_text(text_3, $$props.media.season_year));
			append($$anchor, span_4);
		};

		if_block(node_5, ($$render) => {
			if ($$props.media.season_year) $$render(consequent_4);
		});
	}

	var node_6 = sibling(node_5, 2);

	{
		var consequent_5 = ($$anchor) => {
			var span_5 = root_4$a();
			var text_4 = only_child(span_5, true);

			template_effect(() => set_text(text_4, $$props.media.format));
			append($$anchor, span_5);
		};

		if_block(node_6, ($$render) => {
			if ($$props.media.format) $$render(consequent_5);
		});
	}

	var node_7 = sibling(node_6, 2);

	{
		var consequent_6 = ($$anchor) => {
			var span_6 = root_5$8();
			var text_5 = only_child(span_6);

			template_effect(() => set_text(text_5, `${get(score) ?? ''}%`));
			append($$anchor, span_6);
		};

		if_block(node_7, ($$render) => {
			if (list() && get(score)) $$render(consequent_6);
		});
	}

	var node_8 = sibling(div_3, 2);

	{
		var consequent_7 = ($$anchor) => {
			var div_4 = root_6$8();
			var text_6 = only_child(div_4, true);

			template_effect(($0) => set_text(text_6, $0), [() => $$props.media.genres.slice(0, 4).join(' · ')]);
			append($$anchor, div_4);
		};

		if_block(node_8, ($$render) => {
			if (list() && $$props.media.genres) $$render(consequent_7);
		});
	}

	template_effect(() => {
		classes = set_class(button, 1, 'card svelte-2gevwt', null, classes, { list: list() });
		set_text(text_2, $$props.media.title);
	});

	delegated('click', button, () => $$props.onopen($$props.media));
	append($$anchor, button);
	pop();
}

delegate(['click']);

function slugify(title) {
  return title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’`´]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function titles(m) {
  return [...new Set([m.title_english, m.title_romaji, m.title].filter((t) => !!t))];
}
function fill(schema, title) {
  return schema.replace(/\{slug\}/g, slugify(title)).replace(/\{q\}/g, encodeURIComponent(title));
}
function hasDirect(s) {
  return /\{slug\}/.test(s.url_schema);
}
function directCandidates(s, m) {
  if (!hasDirect(s)) return [];
  const out = /* @__PURE__ */ new Map();
  for (const t of titles(m)) {
    const url = fill(s.url_schema, t);
    if (!out.has(url)) out.set(url, { url, slug: slugify(t) });
  }
  return [...out.values()];
}
function landedOn(finalUrl, slug) {
  if (!finalUrl) return true;
  try {
    return decodeURIComponent(new URL(finalUrl).pathname).toLowerCase().includes(slug.toLowerCase());
  } catch {
    return true;
  }
}
function searchUrl(s, m) {
  const t = titles(m)[1] ?? titles(m)[0] ?? "";
  return fill(s.search_schema || (hasDirect(s) ? "" : s.url_schema), t);
}
function nativeGet() {
  const cap = globalThis.Capacitor;
  const plug = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null;
  if (!plug) return null;
  return async (url) => {
    const r = await plug.request({ url, method: "GET", connectTimeout: 6e3, readTimeout: 8e3 });
    return { status: r.status, url: r.url };
  };
}
async function openService(s, m) {
  const search = searchUrl(s, m);
  const cands = directCandidates(s, m);
  if (!cands.length) return void window.open(search, "_blank", "noopener");
  const get = nativeGet();
  if (!get) return void window.open(cands[0].url, "_blank", "noopener");
  for (const c of cands) {
    try {
      const r = await get(c.url);
      if (r.status >= 200 && r.status < 400 && landedOn(r.url, c.slug)) return void window.open(c.url, "_blank", "noopener");
    } catch {
    }
  }
  window.open(search || cands[0].url, "_blank", "noopener");
}
async function checkDirect(services, m) {
  const get = nativeGet();
  const direct = services.filter(hasDirect);
  if (!get || !direct.length) return get ? [] : null;
  const hits = [];
  await Promise.all(direct.map(async (s) => {
    for (const c of directCandidates(s, m)) {
      try {
        const r = await get(c.url);
        if (r.status >= 200 && r.status < 400 && landedOn(r.url, c.slug)) {
          hits.push({ service: s.name, url: c.url, source: "direct" });
          return;
        }
      } catch {
      }
    }
  }));
  return hits;
}

async function computeHits(m, services, streams) {
  const direct = await checkDirect(services, m);
  if (direct === null && streams === null) return null;
  const hits = [];
  const seen = /* @__PURE__ */ new Set();
  for (const d of direct ?? []) {
    hits.push(d);
    seen.add(d.service.toLowerCase());
  }
  for (const s of streams ?? []) {
    if (seen.has(s.site.toLowerCase())) continue;
    seen.add(s.site.toLowerCase());
    hits.push({ service: s.site, url: s.url, source: "anilist" });
  }
  return hits;
}
async function refreshStreaming(id) {
  try {
    const m = await api.get(id);
    const services = await api.services(m.space === "h" ? "h" : "anime");
    let streams = null;
    if (m.anilist_id) {
      const d = await getDetail(m.anilist_id);
      streams = d ? d.streaming : null;
    }
    const hits = await computeHits(m, services, streams);
    if (hits) await api.putStreaming(id, hits);
  } catch {
  }
}

const streaming = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	computeHits,
	refreshStreaming
}, Symbol.toStringTag, { value: 'Module' }));

var root$b = from_html(`<img alt="" class="svelte-90l7ri"/>`);
var root_1$b = from_html(`<div class="cover-ph svelte-90l7ri"> </div>`);
var root_2$b = from_html(`<span class="dot svelte-90l7ri"></span> `, 1);
var root_3$9 = from_html(`<div class="alts svelte-90l7ri"> </div>`);
var root_4$9 = from_html(`<span class="badge score svelte-90l7ri"><span class="smile svelte-90l7ri">☺</span> </span>`);
var root_5$7 = from_html(`<span class="badge mine svelte-90l7ri"> </span>`);
var root_6$7 = from_html(`<span class="badge pop svelte-90l7ri"> </span>`);
var root_7$7 = from_html(`<span class="badge dub svelte-90l7ri"> </span>`);
var root_8$7 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Format</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_9$7 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Folgen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_10$7 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Status</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_11$7 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Saison</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_12$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Studios</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_13$6 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Quelle</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_14$4 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Herkunftsland</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_15$4 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Begonnen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_16$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Abgeschlossen</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_17$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Wiederholt</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_18$3 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Nächste Folge</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_19$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Ø Wertung</dt><dd class="score svelte-90l7ri"> </dd></div>`);
var root_20$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Beliebtheit</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_21$2 = from_html(`<span class="dubval svelte-90l7ri"> </span>`);
var root_22$2 = from_html(`<span class="muted svelte-90l7ri">nicht erfasst</span>`);
var root_23$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Deine Wertung</dt><dd class="mine svelte-90l7ri"> </dd></div>`);
var root_24$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Sammlung</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_25$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Romaji</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_26$2 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Englisch</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_27$1 = from_html(`<div class="svelte-90l7ri"><dt class="svelte-90l7ri">Nativ</dt><dd class="svelte-90l7ri"> </dd></div>`);
var root_28 = from_html(`<span class="chip svelte-90l7ri"> </span>`);
var root_29 = from_html(`<div class="side-block svelte-90l7ri"><h4 class="svelte-90l7ri">Genres</h4> <div class="chips svelte-90l7ri"></div></div>`);
var root_30 = from_html(`<div class="side-block svelte-90l7ri"><h4 class="svelte-90l7ri">Tags</h4> <div class="chips svelte-90l7ri"></div></div>`);
var root_31 = from_html(`<img alt="" loading="lazy" class="svelte-90l7ri"/>`);
var root_32 = from_html(`<span class="pph svelte-90l7ri"> </span>`);
var root_33 = from_html(`<div class="pn right svelte-90l7ri"><b class="svelte-90l7ri"> </b><small class="svelte-90l7ri">Sprecher (JP)</small></div> <!>`, 1);
var root_34 = from_html(`<div class="person svelte-90l7ri"><!> <div class="pn svelte-90l7ri"><b class="svelte-90l7ri"> </b><small class="svelte-90l7ri"> </small></div> <!></div>`);
var root_35 = from_html(`<div class="people svelte-90l7ri"></div>`);
var root_36 = from_html(`<div class="placeholder svelte-90l7ri"><!></div>`);
var root_37 = from_html(`<span></span>`);
var root_38 = from_html(`<li class="svelte-90l7ri"><i class="svelte-90l7ri"></i> <b class="svelte-90l7ri"> </b> <small class="svelte-90l7ri"> </small></li>`);
var root_39 = from_html(`<div class="stackbar svelte-90l7ri" role="img" aria-label="Status-Verteilung"></div> <ul class="legend svelte-90l7ri"></ul>`, 1);
var root_40 = from_html(`<div class="bcol svelte-90l7ri"><span class="bfill svelte-90l7ri"></span> <small class="svelte-90l7ri"> </small></div>`);
var root_41 = from_html(`<div class="bars svelte-90l7ri" role="img" aria-label="Wertungs-Verteilung"></div>`);
var root_42 = from_html(`<section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Status-Verteilung</h3> <!></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Wertungs-Verteilung</h3> <!></section>`, 1);
var root_43 = from_html(`<button> </button>`);
var root_44 = from_html(`<section class="block svelte-90l7ri"><div class="desc svelte-90l7ri"></div></section>`);
var root_45 = from_html(`<a class="svc stream svelte-90l7ri" target="_blank" rel="noopener"> </a>`);
var root_46 = from_html(`<span class="svc stream svelte-90l7ri"> </span>`);
var root_47 = from_html(`<div class="btnrow svelte-90l7ri"></div>`);
var root_48 = from_html(`<div class="muted-note svelte-90l7ri">prüfe Verfügbarkeit…</div>`);
var root_49 = from_html(`<div class="muted-note svelte-90l7ri">Auf keinem deiner Dienste gefunden.</div>`);
var root_50 = from_html(`<button class="svc ghost svelte-90l7ri"> </button>`);
var root_51 = from_html(`<details class="manual svelte-90l7ri"><summary class="svelte-90l7ri">Dienste selbst öffnen</summary> <div class="btnrow svelte-90l7ri"></div></details>`);
var root_52 = from_html(`<a class="svc ghost svelte-90l7ri" target="_blank" rel="noopener"> </a>`);
var root_53 = from_html(`<section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Infoseiten</h3> <div class="btnrow svelte-90l7ri"></div></section>`);
var root_54 = from_html(`<span class="rph svelte-90l7ri"></span>`);
var root_55 = from_html(`<a class="rel svelte-90l7ri" target="_blank" rel="noopener"><!> <small class="svelte-90l7ri"> </small> <span class="rt svelte-90l7ri"> </span></a>`);
var root_56 = from_html(`<div class="rels svelte-90l7ri"></div>`);
var root_57 = from_html(`<button class="more svelte-90l7ri">Alle Charaktere</button>`);
var root_58 = from_html(`<small class="svelte-90l7ri"> </small>`);
var root_59 = from_html(`<a class="rel svelte-90l7ri" target="_blank" rel="noopener"><!> <span class="rt svelte-90l7ri"> </span> <!></a>`);
var root_60 = from_html(`<!> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Verfügbar auf</h3> <!> <!> <div class="src svelte-90l7ri">Daten: AniList</div></section> <!> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Beziehungen</h3> <!></section> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Charaktere</h3> <!> <!></section> <!> <section class="block svelte-90l7ri"><h3 class="svelte-90l7ri">Empfehlungen</h3> <!></section>`, 1);
var root_61 = from_html(`<section class="block svelte-90l7ri"><!><div class="src svelte-90l7ri">Daten: AniList</div></section>`);
var root_62 = from_html(`<div class="person svelte-90l7ri"><!> <div class="pn svelte-90l7ri"><b class="svelte-90l7ri"> </b><small class="svelte-90l7ri"> </small></div></div>`);
var root_63 = from_html(`<section class="block svelte-90l7ri"><!> <div class="src svelte-90l7ri">Daten: AniList</div></section>`);
var root_64 = from_html(`<div class="tabdists"><!></div> <div class="src svelte-90l7ri">Daten: AniList</div>`, 1);
var root_65 = from_html(`<option> </option>`);
var root_66 = from_html(`<span class="of svelte-90l7ri"> </span>`);
var root_67 = from_html(`<button type="button"> </button>`);
var root_68 = from_html(`<div class="field svelte-90l7ri"><label for="e-lent" class="svelte-90l7ri">Verliehen an (optional)</label> <input id="e-lent" placeholder="leer = im Regal" class="svelte-90l7ri"/></div>`);
var root_69 = from_html(`<div class="modal-scrim svelte-90l7ri" role="presentation"></div> <div class="modal svelte-90l7ri" role="dialog" aria-modal="true" aria-label="Eintrag bearbeiten"><div class="modal-head svelte-90l7ri"><h2 class="svelte-90l7ri">Eintrag bearbeiten</h2> <button class="close sm svelte-90l7ri" aria-label="Schließen">✕</button></div> <div class="modal-title svelte-90l7ri"> </div> <div class="modal-body svelte-90l7ri"><div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-status" class="svelte-90l7ri">Status</label> <select id="e-status" class="svelte-90l7ri"></select></div> <div class="field svelte-90l7ri"><label for="e-score" class="svelte-90l7ri">Punktzahl (1–10)</label> <input id="e-score" type="number" min="0" max="10" step="1" placeholder="—" class="svelte-90l7ri"/></div></div> <div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-prog" class="svelte-90l7ri">Fortschritt <!></label> <input id="e-prog" type="number" min="0" placeholder="0" class="svelte-90l7ri"/></div> <div class="field svelte-90l7ri"><label for="e-reps" class="svelte-90l7ri">Wiederholungen</label> <input id="e-reps" type="number" min="0" placeholder="0" class="svelte-90l7ri"/></div></div> <div class="field svelte-90l7ri"><span class="fl svelte-90l7ri">Sammlung</span> <div class="seg svelte-90l7ri"></div></div> <!> <div class="grid2 svelte-90l7ri"><div class="field svelte-90l7ri"><label for="e-start" class="svelte-90l7ri">Startdatum</label> <input id="e-start" type="date" class="svelte-90l7ri"/></div> <div class="field svelte-90l7ri"><label for="e-end" class="svelte-90l7ri">Enddatum</label> <input id="e-end" type="date" class="svelte-90l7ri"/></div></div> <div class="field svelte-90l7ri"><label for="e-note" class="svelte-90l7ri">Notiz</label> <textarea id="e-note" rows="3" placeholder="eigene Notiz…" class="svelte-90l7ri"></textarea></div></div> <div class="modal-foot svelte-90l7ri"><button class="btn ghost svelte-90l7ri">Abbrechen</button> <button class="btn primary svelte-90l7ri">Speichern</button></div></div>`, 1);
var root_70 = from_html(`<div class="overlay svelte-90l7ri" role="dialog" aria-modal="true"><button class="close svelte-90l7ri" aria-label="Schließen">✕</button> <div><div class="banner-fade svelte-90l7ri"></div></div> <div class="headwrap svelte-90l7ri"><div class="container head-grid svelte-90l7ri"><div class="poster-col svelte-90l7ri"><div class="cover svelte-90l7ri"><!></div> <div class="poster-actions svelte-90l7ri"><button class="addbtn svelte-90l7ri"><!></button> <button aria-label="Favorit" title="Favorit">♥</button></div></div> <div class="head-main svelte-90l7ri"><h1 class="svelte-90l7ri"> </h1> <!> <div class="badges svelte-90l7ri"><!> <!> <!> <!></div> <div class="head-actions svelte-90l7ri"><button class="edit svelte-90l7ri">Bearbeiten</button></div></div></div></div> <div class="container body-grid svelte-90l7ri"><aside class="sidebar svelte-90l7ri"><dl class="data svelte-90l7ri"><!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <div class="svelte-90l7ri"><dt class="svelte-90l7ri">Dub</dt> <dd class="svelte-90l7ri"><!></dd></div> <!> <!> <!> <!> <!></dl> <!> <!></aside> <main class="content svelte-90l7ri"><nav class="tabs svelte-90l7ri" aria-label="Reiter"></nav>  <!></main></div></div> <!>`, 1);

const $$css$b = {
	hash: 'svelte-90l7ri',
	code: '.overlay.svelte-90l7ri {position:fixed;inset:0;z-index:40;overflow-y:auto;overflow-x:hidden;background:var(--bg);}\n  /* oben links, unterhalb der Statusleiste (Akkuanzeige): rechts oben sitzt das Orbit-X der Host-App */.close.svelte-90l7ri {position:fixed;z-index:50;top:calc(max(env(safe-area-inset-top, 0px), 28px) + 12px);left:max(env(safe-area-inset-left, 0px), 0px);margin-left:14px;width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;background:rgba(0, 0, 0, 0.6);color:#fff;font-size:1.1rem;backdrop-filter:blur(4px);}.close.svelte-90l7ri:hover {background:rgba(0, 0, 0, 0.7);}\n\n  /* Voll-Banner */.banner.svelte-90l7ri {position:relative;width:100%;height:330px;background-size:cover;background-position:center 25%;}.banner.empty.svelte-90l7ri {background:linear-gradient(135deg, var(--accent), var(--accent-2));}.banner-fade.svelte-90l7ri {position:absolute;inset:0;background:linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 40%, color-mix(in srgb, var(--surface) 55%, transparent) 100%);}.container.svelte-90l7ri {max-width:var(--maxw);margin:0 auto;padding:0 clamp(16px, 4vw, var(--pad));}\n\n  /* Kopf: Surface-Streifen hinter Titel + Buttons, Cover ragt hoch */.headwrap.svelte-90l7ri {background:var(--surface);box-shadow:var(--shadow-sm);}.head-grid.svelte-90l7ri {display:grid;grid-template-columns:215px 1fr;gap:30px;align-items:start;}.poster-col.svelte-90l7ri {margin-top:-180px;position:relative;z-index:2;display:flex;flex-direction:column;gap:12px;padding-bottom:20px;}.cover.svelte-90l7ri {width:100%;aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;background:var(--surface-2);box-shadow:var(--shadow);}.cover.svelte-90l7ri img:where(.svelte-90l7ri) {width:100%;height:100%;object-fit:cover;display:block;}.cover-ph.svelte-90l7ri {width:100%;height:100%;display:grid;place-items:center;font-size:3rem;font-weight:600;color:var(--text-muted);}.poster-actions.svelte-90l7ri {display:flex;gap:8px;}.addbtn.svelte-90l7ri {flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:0;border-radius:var(--radius);cursor:pointer;background:var(--accent);color:var(--on-accent);font-weight:600;font-size:0.86rem;}.addbtn.svelte-90l7ri:hover {background:var(--accent-dim);}.addbtn.svelte-90l7ri .dot:where(.svelte-90l7ri) {width:8px;height:8px;border-radius:50%;background:var(--on-accent);}.fav.svelte-90l7ri {flex:none;width:42px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-muted);cursor:pointer;font-size:1.05rem;}.fav.svelte-90l7ri:hover {color:var(--bad);}.fav.on.svelte-90l7ri {color:var(--bad);border-color:var(--bad);}.head-main.svelte-90l7ri {padding:24px 0 20px;min-width:0;}h1.svelte-90l7ri {font-size:1.7rem;line-height:1.2;margin:0 0 6px;color:var(--text-strong);font-weight:600;}.alts.svelte-90l7ri {color:var(--text-muted);font-size:0.86rem;margin-bottom:14px;}.badges.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}.badge.svelte-90l7ri {display:inline-flex;align-items:center;gap:5px;font-size:0.78rem;font-weight:600;padding:4px 9px;border-radius:var(--radius);background:var(--surface-2);color:var(--text);}.badge.score.svelte-90l7ri {color:var(--good);}.badge.score.svelte-90l7ri .smile:where(.svelte-90l7ri) {font-size:0.9rem;}.badge.mine.svelte-90l7ri {color:var(--gold);}.badge.dub.svelte-90l7ri {color:var(--accent);}.head-actions.svelte-90l7ri {display:flex;gap:10px;}.edit.svelte-90l7ri {padding:8px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:0.84rem;font-weight:600;}.edit.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}\n\n  /* Körper */.body-grid.svelte-90l7ri {display:grid;grid-template-columns:215px 1fr;gap:30px;padding-top:28px;padding-bottom:60px;}.sidebar.svelte-90l7ri {display:flex;flex-direction:column;gap:18px;}.data.svelte-90l7ri {margin:0;display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;}.data.svelte-90l7ri > div:where(.svelte-90l7ri) {min-width:0;}.data.svelte-90l7ri dt:where(.svelte-90l7ri) {font-size:0.7rem;color:var(--text-muted);margin:0 0 2px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;}.data.svelte-90l7ri dd:where(.svelte-90l7ri) {margin:0;font-size:0.86rem;color:var(--text-strong);font-weight:500;word-break:break-word;}.data.svelte-90l7ri dd.score:where(.svelte-90l7ri) {color:var(--good);}.data.svelte-90l7ri dd.mine:where(.svelte-90l7ri) {color:var(--gold);}.data.svelte-90l7ri .dubval:where(.svelte-90l7ri) {color:var(--accent);font-weight:600;}.data.svelte-90l7ri .muted:where(.svelte-90l7ri) {color:var(--text-muted);font-weight:400;}.side-block.svelte-90l7ri h4:where(.svelte-90l7ri) {font-size:0.7rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:700;margin:0 0 8px;}.chips.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:6px;}.chip.svelte-90l7ri {font-size:0.74rem;padding:4px 10px;border-radius:var(--radius);background:var(--surface-2);color:var(--text);font-weight:500;}\n\n  /* Inhalt rechts */.content.svelte-90l7ri {min-width:0;}.tabs.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px;}.tab.svelte-90l7ri {padding:10px 14px;border:0;background:none;cursor:pointer;color:var(--text-muted);font-size:0.86rem;font-weight:600;border-bottom:2px solid transparent;margin-bottom:-1px;}.tab.svelte-90l7ri:hover {color:var(--text);}.tab.active.svelte-90l7ri {color:var(--accent);border-bottom-color:var(--accent);}.block.svelte-90l7ri {margin-bottom:30px;}.block.svelte-90l7ri h3:where(.svelte-90l7ri) {font-size:0.78rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:700;margin:0 0 12px;}.desc.svelte-90l7ri p {margin:0 0 0.6em;}.desc.svelte-90l7ri {margin:0;color:var(--text);line-height:1.65;font-size:0.92rem;}.btnrow.svelte-90l7ri {display:flex;flex-wrap:wrap;gap:8px;}.svc.svelte-90l7ri {padding:8px 14px;border-radius:var(--radius);background:var(--accent);color:var(--on-accent);font-size:0.82rem;font-weight:600;}.svc.svelte-90l7ri:hover {background:var(--accent-dim);}.svc.ghost.svelte-90l7ri {background:var(--surface-2);color:var(--text);border:1px solid var(--border);}.svc.ghost.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}.placeholder.svelte-90l7ri {padding:22px;border:1px dashed var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text-muted);font-size:0.84rem;text-align:center;}.svc.stream.svelte-90l7ri {display:inline-flex;align-items:center;gap:8px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);min-height:36px;}.svc.stream.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}.muted-note.svelte-90l7ri {color:var(--text-muted);font-size:0.84rem;}.manual.svelte-90l7ri {margin-top:12px;}.manual.svelte-90l7ri summary:where(.svelte-90l7ri) {cursor:pointer;color:var(--text-muted);font-size:0.8rem;margin-bottom:8px;}.src.svelte-90l7ri {margin-top:10px;font-size:0.72rem;color:var(--text-muted);}.more.svelte-90l7ri {margin-top:10px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:0.82rem;font-weight:600;}.more.svelte-90l7ri:hover {border-color:var(--accent);color:var(--accent);}.people.svelte-90l7ri {display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;}.person.svelte-90l7ri {display:flex;align-items:center;gap:10px;background:var(--surface);border-radius:var(--radius);padding:6px;min-width:0;}.person.svelte-90l7ri img:where(.svelte-90l7ri), .pph.svelte-90l7ri {width:48px;height:64px;border-radius:var(--radius-sm);object-fit:cover;flex:none;background:var(--surface-2);}.pph.svelte-90l7ri {display:grid;place-items:center;color:var(--text-muted);font-weight:600;}.pn.svelte-90l7ri {display:flex;flex-direction:column;min-width:0;flex:1;}.pn.right.svelte-90l7ri {text-align:right;}.pn.svelte-90l7ri b:where(.svelte-90l7ri) {font-size:0.82rem;font-weight:600;color:var(--text-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.pn.svelte-90l7ri small:where(.svelte-90l7ri), .legend.svelte-90l7ri small:where(.svelte-90l7ri), .rel.svelte-90l7ri small:where(.svelte-90l7ri) {color:var(--text-muted);font-size:0.72rem;}.rels.svelte-90l7ri {display:grid;grid-template-columns:repeat(auto-fill, minmax(104px, 1fr));gap:14px 12px;}.rel.svelte-90l7ri {display:flex;flex-direction:column;gap:4px;min-width:0;color:inherit;text-decoration:none;}.rel.svelte-90l7ri img:where(.svelte-90l7ri), .rph.svelte-90l7ri {width:100%;aspect-ratio:185 / 265;object-fit:cover;border-radius:var(--radius);background:var(--surface-2);display:block;}.rel.svelte-90l7ri:hover .rt:where(.svelte-90l7ri) {color:var(--accent);}.rt.svelte-90l7ri {font-size:0.78rem;line-height:1.3;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.stackbar.svelte-90l7ri {display:flex;height:14px;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-2);}.legend.svelte-90l7ri {list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:6px 14px;font-size:0.8rem;color:var(--text);}.legend.svelte-90l7ri li:where(.svelte-90l7ri) {display:flex;align-items:center;gap:6px;}.legend.svelte-90l7ri i:where(.svelte-90l7ri) {width:10px;height:10px;border-radius:3px;flex:none;}.legend.svelte-90l7ri b:where(.svelte-90l7ri) {margin-left:auto;font-weight:600;color:var(--text-strong);}.bars.svelte-90l7ri {display:flex;align-items:flex-end;gap:6px;height:130px;}.bcol.svelte-90l7ri {flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;}.bfill.svelte-90l7ri {width:100%;background:var(--accent);border-radius:3px 3px 0 0;min-height:2px;}.bcol.svelte-90l7ri small:where(.svelte-90l7ri) {font-size:0.68rem;color:var(--text-muted);}\n\n  /* ---------- Bearbeiten-Modal ---------- */.modal-scrim.svelte-90l7ri {position:fixed;inset:0;z-index:60;background:rgba(0, 0, 0, 0.6);}.modal.svelte-90l7ri {position:fixed;z-index:61;top:50%;left:50%;transform:translate(-50%, -50%);width:min(520px, calc(100% - 32px));max-height:calc(100% - 48px);overflow-y:auto;background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);border:1px solid var(--border);}.modal-head.svelte-90l7ri {display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;}.modal-head.svelte-90l7ri h2:where(.svelte-90l7ri) {margin:0;font-size:1.05rem;color:var(--text-strong);font-weight:600;}.close.sm.svelte-90l7ri {position:static;margin:0;width:40px;height:40px;background:var(--surface-2);color:var(--text-muted);backdrop-filter:none;}.close.sm.svelte-90l7ri:hover {color:var(--text);background:var(--surface-2);}.modal-title.svelte-90l7ri {padding:2px 20px 0;color:var(--accent);font-size:0.86rem;font-weight:600;}.modal-body.svelte-90l7ri {padding:16px 20px;display:flex;flex-direction:column;gap:14px;}.grid2.svelte-90l7ri {display:grid;grid-template-columns:1fr 1fr;gap:14px;}.field.svelte-90l7ri {display:flex;flex-direction:column;min-width:0;}.field.svelte-90l7ri label:where(.svelte-90l7ri), .field.svelte-90l7ri .fl:where(.svelte-90l7ri) {font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;}.field.svelte-90l7ri .of:where(.svelte-90l7ri) {color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0;}select.svelte-90l7ri, input.svelte-90l7ri, textarea.svelte-90l7ri {width:100%;padding:9px 11px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:0.86rem;font-family:inherit;}select.svelte-90l7ri:focus, input.svelte-90l7ri:focus, textarea.svelte-90l7ri:focus {outline:none;border-color:var(--accent);}textarea.svelte-90l7ri {resize:vertical;line-height:1.5;}.seg.svelte-90l7ri {display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}.seg.svelte-90l7ri button:where(.svelte-90l7ri) {flex:1;padding:9px 4px;border:0;background:var(--surface-2);color:var(--text-muted);cursor:pointer;font-size:0.82rem;}.seg.svelte-90l7ri button:where(.svelte-90l7ri):hover {color:var(--text);}.seg.svelte-90l7ri button.on:where(.svelte-90l7ri) {background:var(--accent);color:var(--on-accent);font-weight:600;}.modal-foot.svelte-90l7ri {display:flex;justify-content:flex-end;gap:10px;padding:0 20px 20px;}.btn.svelte-90l7ri {padding:9px 18px;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;font-size:0.86rem;font-weight:600;}.btn.ghost.svelte-90l7ri {background:var(--surface-2);color:var(--text);}.btn.ghost.svelte-90l7ri:hover {color:var(--text-strong);}.btn.primary.svelte-90l7ri {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.btn.primary.svelte-90l7ri:hover {background:var(--accent-dim);}\n\n  /* ---------- Responsive ---------- */\n  @media (max-width: 880px) {.head-grid.svelte-90l7ri, .body-grid.svelte-90l7ri {grid-template-columns:150px 1fr;gap:20px;}.poster-col.svelte-90l7ri {margin-top:-120px;}h1.svelte-90l7ri {font-size:1.4rem;}\n  }\n  @media (max-width: 620px) {.banner.svelte-90l7ri {height:200px;}.head-grid.svelte-90l7ri {grid-template-columns:110px 1fr;gap:16px;}.poster-col.svelte-90l7ri {margin-top:-70px;min-width:0;}.poster-actions.svelte-90l7ri {flex-direction:column;gap:6px;}.poster-actions.svelte-90l7ri .addbtn:where(.svelte-90l7ri), .poster-actions.svelte-90l7ri .fav:where(.svelte-90l7ri) {width:100%;min-width:0;font-size:0.74rem;padding:8px 4px;}.body-grid.svelte-90l7ri {grid-template-columns:1fr;}.head-main.svelte-90l7ri {padding-top:16px;}.grid2.svelte-90l7ri {grid-template-columns:1fr;}\n  }'
};

function Detail($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$b);

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

	// Reiter
	const TABS = [
		{ id: 'overview', label: 'Übersicht' },
		{ id: 'characters', label: 'Charaktere' },
		{ id: 'staff', label: 'Mitwirkende' },
		{ id: 'stats', label: 'Statistiken' }
	];

	let tab = state('overview');

	// --- AniList-Laufzeitdaten (Cover, Banner, Charaktere, Beziehungen, Streaming …) ---------------
	// Kommen erst auf dem Gerät per anilist_id; bis dahin / ohne Netz Platzhalter bzw. leere Zustände.
	const aid = user_derived(() => $$props.media.anilist_id ?? null);

	user_effect(() => {
		want(get(aid));
	});

	const art = user_derived(() => lightOf(get(aid)));
	const cover = user_derived(() => m.cover_url || get(art)?.cover);
	const banner = user_derived(() => m.banner_url || get(art)?.banner);
	const avg = user_derived(() => m.average_score ?? get(art)?.score);
	const pop$1 = user_derived(() => m.popularity ?? get(art)?.popularity);
	let det = state(null);
	let detState = state('loading');

	user_effect(() => {
		const id = get(aid);

		set(det, null);

		if (!id) {
			set(detState, 'fail');

			return;
		}

		set(detState, 'loading');

		let alive = true;

		getDetail(id).then((d) => {
			if (!alive) return;

			set(det, d, true);
			set(detState, d ? 'ok' : 'fail', true);
		});

		return () => {
			alive = false;
		};
	});

	// Verfuegbarkeit: gespeicherte Treffer sofort, dann frisch pruefen (AniList-Links + eigene Direktlinks) und speichern
	let hits = state(proxy([]));

	let hitState = state('loading');

	user_effect(() => {
		const id = $$props.media.id;

		set(hits, [], true);
		set(hitState, 'loading');

		api.streamingOf(id).then((r) => {
			if (get(hitState) === 'loading' && $$props.media.id === id) set(hits, r.items ?? [], true);
		}).catch(() => {});
	});

	user_effect(() => {
		if (get(detState) === 'loading') return;

		const streams = get(det) ? get(det).streaming : null;
		const id = $$props.media.id;
		let alive = true;

		computeHits(m, services(), streams).then(async (h) => {
			if (!alive || !h) return;

			set(hits, h, true);
			set(hitState, 'done');

			try {
				await api.putStreaming(id, h);
			} catch {}
		});

		return () => {
			alive = false;
		};
	});

	const descHtml = user_derived(() => safeHtml(get(det)?.description || m.description));

	const REL_DE = {
		SOURCE: 'Vorlage',
		PREQUEL: 'Vorgänger',
		SEQUEL: 'Fortsetzung',
		PARENT: 'Hauptgeschichte',
		SIDE_STORY: 'Nebengeschichte',
		CHARACTER: 'Gleiche Charaktere',
		SUMMARY: 'Zusammenfassung',
		ALTERNATIVE: 'Alternative',
		SPIN_OFF: 'Spin-off',
		ADAPTATION: 'Adaption',
		CONTAINS: 'Enthält',
		COMPATIBLE: 'Kompatibel',
		OTHER: 'Sonstiges'
	};

	const ROLE_DE = {
		MAIN: 'Hauptrolle',
		SUPPORTING: 'Nebenrolle',
		BACKGROUND: 'Statist'
	};

	const DIST_DE = {
		CURRENT: 'Schauen gerade',
		PLANNING: 'Geplant',
		COMPLETED: 'Abgeschlossen',
		DROPPED: 'Abgebrochen',
		PAUSED: 'Pausiert',
		REPEATING: 'Wiederholen'
	};

	const DIST_COL = {
		CURRENT: 'var(--accent)',
		PLANNING: 'var(--gold)',
		COMPLETED: 'var(--good)',
		DROPPED: 'var(--bad)',
		PAUSED: 'var(--text-muted)',
		REPEATING: 'var(--accent-2)'
	};

	const nf = new Intl.NumberFormat('de-DE');
	const alUrl = (x) => `https://anilist.co/${x.type === 'MANGA' ? 'manga' : 'anime'}/${x.id}`;
	const statusTotal = user_derived(() => (get(det)?.statusDist ?? []).reduce((a, x) => a + x.amount, 0));
	const scoreMax = user_derived(() => Math.max(1, ...(get(det)?.scoreDist ?? []).map((x) => x.amount)));
	const relations = user_derived(() => (get(det)?.relations ?? []).filter((r) => r.type === 'ANIME' || r.type === 'MANGA'));

	// Escape schließt (zuerst das Bearbeiten-Fenster, dann die Detailansicht)
	function onKey(e) {
		if (e.key !== 'Escape') return;
		if (get(editing)) set(editing, false); else $$props.onclose();
	}

	const alts = user_derived(() => [m.title_romaji, m.title_english, m.title_native].filter((t) => t && t !== m.title));
	var fragment = root_70();

	event('keydown', $window, onKey);

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
			var img = root$b();

			template_effect(() => set_attribute(img, 'src', get(cover)));
			append($$anchor, img);
		};

		var alternate = ($$anchor) => {
			var div_6 = root_1$b();
			var text_1 = only_child(div_6, true);

			template_effect(() => set_text(text_1, m.title?.[0] ?? '?'));
			append($$anchor, div_6);
		};

		if_block(node, ($$render) => {
			if (get(cover)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var div_7 = sibling(div_5, 2);
	var button_1 = child(div_7);
	var node_1 = child(button_1);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_1 = root_2$b();
			var text_2 = sibling(first_child(fragment_1), 1, true);

			template_effect(($0) => set_text(text_2, $0), [() => watchLabel(m.watch_status)]);
			append($$anchor, fragment_1);
		};

		var alternate_1 = ($$anchor) => {
			var text_3 = text('Zur Liste hinzufügen');

			append($$anchor, text_3);
		};

		if_block(node_1, ($$render) => {
			if (get(inList)) $$render(consequent_1); else $$render(alternate_1, -1);
		});
	}

	var button_2 = sibling(button_1, 2);
	let classes_1;

	var div_8 = sibling(div_4, 2);
	var h1 = child(div_8);
	var text_4 = only_child(h1, true);
	var node_2 = sibling(h1, 2);

	{
		var consequent_2 = ($$anchor) => {
			var div_9 = root_3$9();
			var text_5 = only_child(div_9, true);

			template_effect(($0) => set_text(text_5, $0), [() => get(alts).join(' · ')]);
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
			var span = root_4$9();
			var text_6 = sibling(child(span));
			template_effect(() => set_text(text_6, ` ${get(avg) ?? ''}%`));
			append($$anchor, span);
		};

		if_block(node_3, ($$render) => {
			if (get(avg)) $$render(consequent_3);
		});
	}

	var node_4 = sibling(node_3, 2);

	{
		var consequent_4 = ($$anchor) => {
			var span_1 = root_5$7();
			var text_7 = only_child(span_1);

			template_effect(() => set_text(text_7, `★ ${m.rating ?? ''}`));
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
			var text_8 = only_child(span_2);

			template_effect(($0) => set_text(text_8, `Beliebtheit ${$0 ?? ''}`), [() => get(pop$1).toLocaleString('de-DE')]);
			append($$anchor, span_2);
		};

		if_block(node_5, ($$render) => {
			if (get(pop$1)) $$render(consequent_5);
		});
	}

	var node_6 = sibling(node_5, 2);

	{
		var consequent_6 = ($$anchor) => {
			var span_3 = root_7$7();
			var text_9 = only_child(span_3);

			template_effect(() => set_text(text_9, `Deutscher Dub${m.dub_tier ? ` · ${m.dub_tier}` : ''}`));
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
			var div_13 = root_8$7();
			var dd = sibling(child(div_13));
			var text_10 = only_child(dd, true);
			template_effect(($0) => set_text(text_10, $0), [() => fmtFormat(m.format)]);
			append($$anchor, div_13);
		};

		if_block(node_7, ($$render) => {
			if (m.format) $$render(consequent_7);
		});
	}

	var node_8 = sibling(node_7, 2);

	{
		var consequent_8 = ($$anchor) => {
			var div_14 = root_9$7();
			var dd_1 = sibling(child(div_14));
			var text_11 = only_child(dd_1, true);
			template_effect(() => set_text(text_11, m.episodes));
			append($$anchor, div_14);
		};

		if_block(node_8, ($$render) => {
			if (m.episodes) $$render(consequent_8);
		});
	}

	var node_9 = sibling(node_8, 2);

	{
		var consequent_9 = ($$anchor) => {
			var div_15 = root_10$7();
			var dd_2 = sibling(child(div_15));
			var text_12 = only_child(dd_2, true);
			template_effect(($0) => set_text(text_12, $0), [() => watchLabel(m.watch_status)]);
			append($$anchor, div_15);
		};

		if_block(node_9, ($$render) => {
			if (get(inList)) $$render(consequent_9);
		});
	}

	var node_10 = sibling(node_9, 2);

	{
		var consequent_10 = ($$anchor) => {
			var div_16 = root_11$7();
			var dd_3 = sibling(child(div_16));
			var text_13 = only_child(dd_3);
			template_effect(() => set_text(text_13, `${m.season ? (SEASON_DE[m.season] ?? m.season) + ' ' : ''}${m.season_year ?? ''}`));
			append($$anchor, div_16);
		};

		if_block(node_10, ($$render) => {
			if (m.season_year) $$render(consequent_10);
		});
	}

	var node_11 = sibling(node_10, 2);

	{
		var consequent_11 = ($$anchor) => {
			var div_17 = root_12$6();
			var dd_4 = sibling(child(div_17));
			var text_14 = only_child(dd_4, true);
			template_effect(($0) => set_text(text_14, $0), [() => m.studios.join(', ')]);
			append($$anchor, div_17);
		};

		if_block(node_11, ($$render) => {
			if (m.studios?.length) $$render(consequent_11);
		});
	}

	var node_12 = sibling(node_11, 2);

	{
		var consequent_12 = ($$anchor) => {
			var div_18 = root_13$6();
			var dd_5 = sibling(child(div_18));
			var text_15 = only_child(dd_5, true);
			template_effect(() => set_text(text_15, SOURCE_DE[m.source] ?? m.source));
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
			var text_16 = only_child(dd_6, true);
			template_effect(() => set_text(text_16, COUNTRY_DE[m.country] ?? m.country));
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
			var text_17 = only_child(dd_7, true);
			template_effect(() => set_text(text_17, m.started_at));
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
			var text_18 = only_child(dd_8, true);
			template_effect(() => set_text(text_18, m.completed_at));
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
			var text_19 = only_child(dd_9);
			template_effect(() => set_text(text_19, `${m.rewatches ?? ''}×`));
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
			var text_20 = only_child(dd_10);

			template_effect(($0) => set_text(text_20, `Ep. ${get(det).nextAiring.episode ?? ''} · ${$0 ?? ''}`), [
				() => new Date(get(det).nextAiring.at * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
			]);

			append($$anchor, div_23);
		};

		if_block(node_17, ($$render) => {
			if (get(det)?.nextAiring && !m.next_airing_ep) $$render(consequent_17);
		});
	}

	var node_18 = sibling(node_17, 2);

	{
		var consequent_18 = ($$anchor) => {
			var div_24 = root_18$3();
			var dd_11 = sibling(child(div_24));
			var text_21 = only_child(dd_11);

			template_effect(($0) => set_text(text_21, `Ep. ${m.next_airing_ep ?? ''} · ${$0 ?? ''}`), [
				() => new Date(m.next_airing_at * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
			]);

			append($$anchor, div_24);
		};

		if_block(node_18, ($$render) => {
			if (m.next_airing_ep && m.next_airing_at) $$render(consequent_18);
		});
	}

	var node_19 = sibling(node_18, 2);

	{
		var consequent_19 = ($$anchor) => {
			var div_25 = root_19$2();
			var dd_12 = sibling(child(div_25));
			var text_22 = only_child(dd_12);
			template_effect(() => set_text(text_22, `${get(avg) ?? ''}%`));
			append($$anchor, div_25);
		};

		if_block(node_19, ($$render) => {
			if (get(avg)) $$render(consequent_19);
		});
	}

	var node_20 = sibling(node_19, 2);

	{
		var consequent_20 = ($$anchor) => {
			var div_26 = root_20$2();
			var dd_13 = sibling(child(div_26));
			var text_23 = only_child(dd_13, true);
			template_effect(($0) => set_text(text_23, $0), [() => get(pop$1).toLocaleString('de-DE')]);
			append($$anchor, div_26);
		};

		if_block(node_20, ($$render) => {
			if (get(pop$1)) $$render(consequent_20);
		});
	}

	var div_27 = sibling(node_20, 2);
	var dd_14 = sibling(child(div_27), 2);
	var node_21 = child(dd_14);

	{
		var consequent_21 = ($$anchor) => {
			var span_4 = root_21$2();
			var text_24 = only_child(span_4);

			template_effect(() => set_text(text_24, `Deutsch${m.dub_tier ? ` (${m.dub_tier})` : ''}`));
			append($$anchor, span_4);
		};

		var alternate_2 = ($$anchor) => {
			var span_5 = root_22$2();

			append($$anchor, span_5);
		};

		if_block(node_21, ($$render) => {
			if (m.dub_de) $$render(consequent_21); else $$render(alternate_2, -1);
		});
	}

	var node_22 = sibling(div_27, 2);

	{
		var consequent_22 = ($$anchor) => {
			var div_28 = root_23$2();
			var dd_15 = sibling(child(div_28));
			var text_25 = only_child(dd_15);
			template_effect(() => set_text(text_25, `★ ${m.rating ?? ''}/10`));
			append($$anchor, div_28);
		};

		if_block(node_22, ($$render) => {
			if (m.rating) $$render(consequent_22);
		});
	}

	var node_23 = sibling(node_22, 2);

	{
		var consequent_23 = ($$anchor) => {
			var div_29 = root_24$2();
			var dd_16 = sibling(child(div_29));
			var text_26 = only_child(dd_16, true);
			template_effect(($0) => set_text(text_26, $0), [() => COLL.find(([v]) => v === m.collection)?.[1]]);
			append($$anchor, div_29);
		};

		if_block(node_23, ($$render) => {
			if (m.collection && m.collection !== 'none') $$render(consequent_23);
		});
	}

	var node_24 = sibling(node_23, 2);

	{
		var consequent_24 = ($$anchor) => {
			var div_30 = root_25$2();
			var dd_17 = sibling(child(div_30));
			var text_27 = only_child(dd_17, true);
			template_effect(() => set_text(text_27, m.title_romaji));
			append($$anchor, div_30);
		};

		if_block(node_24, ($$render) => {
			if (m.title_romaji) $$render(consequent_24);
		});
	}

	var node_25 = sibling(node_24, 2);

	{
		var consequent_25 = ($$anchor) => {
			var div_31 = root_26$2();
			var dd_18 = sibling(child(div_31));
			var text_28 = only_child(dd_18, true);
			template_effect(() => set_text(text_28, m.title_english));
			append($$anchor, div_31);
		};

		if_block(node_25, ($$render) => {
			if (m.title_english) $$render(consequent_25);
		});
	}

	var node_26 = sibling(node_25, 2);

	{
		var consequent_26 = ($$anchor) => {
			var div_32 = root_27$1();
			var dd_19 = sibling(child(div_32));
			var text_29 = only_child(dd_19, true);
			template_effect(() => set_text(text_29, m.title_native));
			append($$anchor, div_32);
		};

		if_block(node_26, ($$render) => {
			if (m.title_native) $$render(consequent_26);
		});
	}

	var node_27 = sibling(dl, 2);

	{
		var consequent_27 = ($$anchor) => {
			var div_33 = root_29();
			var div_34 = sibling(child(div_33), 2);

			each(div_34, 21, () => m.genres, index, ($$anchor, g) => {
				var span_6 = root_28();
				var text_30 = only_child(span_6, true);

				template_effect(() => set_text(text_30, get(g)));
				append($$anchor, span_6);
			});
			append($$anchor, div_33);
		};

		if_block(node_27, ($$render) => {
			if (m.genres?.length) $$render(consequent_27);
		});
	}

	var node_28 = sibling(node_27, 2);

	{
		var consequent_28 = ($$anchor) => {
			var div_35 = root_30();
			var div_36 = sibling(child(div_35), 2);

			each(div_36, 21, () => m.tags, index, ($$anchor, t) => {
				var span_7 = root_28();
				var text_31 = only_child(span_7, true);

				template_effect(() => set_text(text_31, get(t)));
				append($$anchor, span_7);
			});
			append($$anchor, div_35);
		};

		if_block(node_28, ($$render) => {
			if (m.tags?.length) $$render(consequent_28);
		});
	}

	var main = sibling(aside, 2);

	{
		const charList = ($$anchor, limit = noop) => {
			var fragment_2 = comment();
			var node_29 = first_child(fragment_2);

			{
				var consequent_32 = ($$anchor) => {
					var div_37 = root_35();

					each(div_37, 21, () => get(det).characters.slice(0, limit()), (c) => c.char.id, ($$anchor, c) => {
						var div_38 = root_34();
						var node_30 = child(div_38);

						{
							var consequent_29 = ($$anchor) => {
								var img_1 = root_31();

								template_effect(() => set_attribute(img_1, 'src', get(c).char.image));
								append($$anchor, img_1);
							};

							var alternate_3 = ($$anchor) => {
								var span_8 = root_32();
								var text_32 = only_child(span_8, true);

								template_effect(() => set_text(text_32, get(c).char.name[0]));
								append($$anchor, span_8);
							};

							if_block(node_30, ($$render) => {
								if (get(c).char.image) $$render(consequent_29); else $$render(alternate_3, -1);
							});
						}

						var div_39 = sibling(node_30, 2);
						var b = child(div_39);
						var text_33 = only_child(b, true);
						var small = sibling(b);
						var text_34 = only_child(small, true);

						var node_31 = sibling(div_39, 2);

						{
							var consequent_31 = ($$anchor) => {
								var fragment_3 = root_33();
								var div_40 = first_child(fragment_3);
								var b_1 = child(div_40);
								var text_35 = only_child(b_1, true);

								var node_32 = sibling(div_40, 2);

								{
									var consequent_30 = ($$anchor) => {
										var img_2 = root_31();

										template_effect(() => set_attribute(img_2, 'src', get(c).actors[0].image));
										append($$anchor, img_2);
									};

									var alternate_4 = ($$anchor) => {
										var span_9 = root_32();
										var text_36 = only_child(span_9, true);

										template_effect(() => set_text(text_36, get(c).actors[0].name[0]));
										append($$anchor, span_9);
									};

									if_block(node_32, ($$render) => {
										if (get(c).actors[0].image) $$render(consequent_30); else $$render(alternate_4, -1);
									});
								}

								template_effect(() => set_text(text_35, get(c).actors[0].name));
								append($$anchor, fragment_3);
							};

							if_block(node_31, ($$render) => {
								if (get(c).actors[0]) $$render(consequent_31);
							});
						}

						template_effect(() => {
							set_text(text_33, get(c).char.name);
							set_text(text_34, ROLE_DE[get(c).role] ?? get(c).role);
						});

						append($$anchor, div_38);
					});
					append($$anchor, div_37);
				};

				var alternate_5 = ($$anchor) => {
					empty($$anchor, () => 'Keine Charaktere bei AniList.');
				};

				if_block(node_29, ($$render) => {
					if (get(det)?.characters.length) $$render(consequent_32); else $$render(alternate_5, -1);
				});
			}

			append($$anchor, fragment_2);
		};

		const empty = ($$anchor, text$1 = noop) => {
			var div_41 = root_36();
			var node_33 = child(div_41);

			{
				var consequent_33 = ($$anchor) => {
					var text_37 = text('lädt von AniList…');

					append($$anchor, text_37);
				};

				var consequent_34 = ($$anchor) => {
					var text_38 = text('Dieser Titel hat keine AniList-ID.');

					append($$anchor, text_38);
				};

				var consequent_35 = ($$anchor) => {
					var text_39 = text('Keine Verbindung zu AniList — später erneut öffnen.');

					append($$anchor, text_39);
				};

				var alternate_6 = ($$anchor) => {
					var text_40 = text();

					template_effect(() => set_text(text_40, text$1()));
					append($$anchor, text_40);
				};

				if_block(node_33, ($$render) => {
					if (get(detState) === 'loading') $$render(consequent_33); else if (!get(aid)) $$render(consequent_34, 1); else if (get(detState) === 'fail') $$render(consequent_35, 2); else $$render(alternate_6, -1);
				});
			}
			append($$anchor, div_41);
		};

		const dists = ($$anchor) => {
			var fragment_6 = root_42();
			var section = first_child(fragment_6);
			var node_34 = sibling(child(section), 2);

			{
				var consequent_36 = ($$anchor) => {
					var fragment_7 = root_39();
					var div_42 = first_child(fragment_7);

					each(div_42, 21, () => get(det).statusDist, index, ($$anchor, x) => {
						var span_10 = root_37();

						template_effect(
							($0) => {
								set_style(span_10, `flex:${get(x).amount ?? ''};background:${DIST_COL[get(x).status] ?? 'var(--border)' ?? ''}`);
								set_attribute(span_10, 'title', `${DIST_DE[get(x).status] ?? get(x).status ?? ''}: ${$0 ?? ''}`);
							},
							[() => nf.format(get(x).amount)]
						);

						append($$anchor, span_10);
					});

					var ul = sibling(div_42, 2);

					each(ul, 21, () => get(det).statusDist, index, ($$anchor, x) => {
						var li = root_38();
						var i = child(li);
						var text_41 = sibling(i, 1, true);
						var b_2 = sibling(text_41);
						var text_42 = only_child(b_2, true);
						var small_1 = sibling(b_2, 2);
						var text_43 = only_child(small_1);

						template_effect(
							($0, $1) => {
								set_style(i, `background:${DIST_COL[get(x).status] ?? 'var(--border)' ?? ''}`);
								set_text(text_41, DIST_DE[get(x).status] ?? get(x).status);
								set_text(text_42, $0);
								set_text(text_43, `(${$1 ?? ''} %)`);
							},
							[
								() => nf.format(get(x).amount),
								() => Math.round(get(x).amount / get(statusTotal) * 100)
							]
						);

						append($$anchor, li);
					});
					append($$anchor, fragment_7);
				};

				var alternate_7 = ($$anchor) => {
					empty($$anchor, () => 'Keine Verteilung vorhanden.');
				};

				if_block(node_34, ($$render) => {
					if (get(det)?.statusDist.length && get(statusTotal)) $$render(consequent_36); else $$render(alternate_7, -1);
				});
			}

			var section_1 = sibling(section, 2);
			var node_35 = sibling(child(section_1), 2);

			{
				var consequent_37 = ($$anchor) => {
					var div_43 = root_41();

					each(div_43, 21, () => get(det).scoreDist, index, ($$anchor, x) => {
						var div_44 = root_40();
						var span_11 = child(div_44);
						var small_2 = sibling(span_11, 2);
						var text_44 = only_child(small_2, true);

						template_effect(
							($0) => {
								set_attribute(div_44, 'title', `${get(x).score ?? ''}: ${$0 ?? ''}`);
								set_style(span_11, `height:${get(x).amount / get(scoreMax) * 100}%`);
								set_text(text_44, get(x).score);
							},
							[() => nf.format(get(x).amount)]
						);

						append($$anchor, div_44);
					});
					append($$anchor, div_43);
				};

				var alternate_8 = ($$anchor) => {
					empty($$anchor, () => 'Keine Wertungen vorhanden.');
				};

				if_block(node_35, ($$render) => {
					if (get(det)?.scoreDist.length) $$render(consequent_37); else $$render(alternate_8, -1);
				});
			}
			append($$anchor, fragment_6);
		};

		var nav = child(main);

		each(nav, 21, () => TABS, index, ($$anchor, t) => {
			var button_4 = root_43();
			let classes_2;
			var text_45 = only_child(button_4, true);

			template_effect(() => {
				classes_2 = set_class(button_4, 1, 'tab svelte-90l7ri', null, classes_2, { active: get(tab) === get(t).id });
				set_text(text_45, get(t).label);
			});

			delegated('click', button_4, () => set(tab, get(t).id, true));
			append($$anchor, button_4);
		});

		var node_36 = sibling(nav, 2);

		{
			var consequent_50 = ($$anchor) => {
				var fragment_10 = root_60();
				var node_37 = first_child(fragment_10);

				{
					var consequent_38 = ($$anchor) => {
						var section_2 = root_44();
						var div_45 = child(section_2);

						html(div_45, () => get(descHtml), true);
						append($$anchor, section_2);
					};

					if_block(node_37, ($$render) => {
						if (get(descHtml)) $$render(consequent_38);
					});
				}

				var section_3 = sibling(node_37, 2);
				var node_38 = sibling(child(section_3), 2);

				{
					var consequent_40 = ($$anchor) => {
						var div_46 = root_47();

						each(div_46, 21, () => get(hits), index, ($$anchor, h) => {
							var fragment_11 = comment();
							var node_39 = first_child(fragment_11);

							{
								var consequent_39 = ($$anchor) => {
									var a_1 = root_45();
									var text_46 = only_child(a_1, true);

									template_effect(() => {
										set_attribute(a_1, 'href', get(h).url);
										set_attribute(a_1, 'title', get(h).source === 'direct' ? 'Seite beim Dienst gefunden' : 'Laut AniList');
										set_text(text_46, get(h).service);
									});

									append($$anchor, a_1);
								};

								var alternate_9 = ($$anchor) => {
									var span_12 = root_46();
									var text_47 = only_child(span_12, true);

									template_effect(() => set_text(text_47, get(h).service));
									append($$anchor, span_12);
								};

								if_block(node_39, ($$render) => {
									if (get(h).url) $$render(consequent_39); else $$render(alternate_9, -1);
								});
							}

							append($$anchor, fragment_11);
						});
						append($$anchor, div_46);
					};

					var consequent_41 = ($$anchor) => {
						var div_47 = root_48();

						append($$anchor, div_47);
					};

					var alternate_10 = ($$anchor) => {
						var div_48 = root_49();

						append($$anchor, div_48);
					};

					if_block(node_38, ($$render) => {
						if (get(hits).length) $$render(consequent_40); else if (get(hitState) === 'loading') $$render(consequent_41, 1); else $$render(alternate_10, -1);
					});
				}

				var node_40 = sibling(node_38, 2);

				{
					var consequent_42 = ($$anchor) => {
						var details = root_51();
						var div_49 = sibling(child(details), 2);

						each(div_49, 21, services, index, ($$anchor, s) => {
							var button_5 = root_50();
							var text_48 = only_child(button_5);

							template_effect(
								($0, $1) => {
									set_attribute(button_5, 'title', $0);
									set_text(text_48, `${get(s).name ?? ''}${$1 ?? ''}`);
								},
								[
									() => hasDirect(get(s))
										? 'Öffnet die Serienseite, sonst die Suche'
										: 'Öffnet die Suche dort – ob der Titel verfügbar ist, ist nicht geprüft',
									() => hasDirect(get(s)) ? '' : ' (Suche)'
								]
							);

							delegated('click', button_5, () => openService(get(s), m));
							append($$anchor, button_5);
						});
						append($$anchor, details);
					};

					if_block(node_40, ($$render) => {
						if (services().length) $$render(consequent_42);
					});
				}

				var node_41 = sibling(section_3, 2);

				{
					var consequent_43 = ($$anchor) => {
						var section_4 = root_53();
						var div_50 = sibling(child(section_4), 2);

						each(div_50, 21, () => Object.entries(m.info_links), index, ($$anchor, $$item) => {
							var $$array = user_derived(() => to_array(get($$item), 2));
							let k = () => get($$array)[0];
							let url = () => get($$array)[1];
							var a_2 = root_52();
							var text_49 = only_child(a_2, true);

							template_effect(() => {
								set_attribute(a_2, 'href', url());
								set_text(text_49, LINK_LABEL[k()] ?? k());
							});

							append($$anchor, a_2);
						});
						append($$anchor, section_4);
					};

					var d_1 = user_derived(() => m.info_links && Object.keys(m.info_links).length);

					if_block(node_41, ($$render) => {
						if (get(d_1)) $$render(consequent_43);
					});
				}

				var section_5 = sibling(node_41, 2);
				var node_42 = sibling(child(section_5), 2);

				{
					var consequent_45 = ($$anchor) => {
						var div_51 = root_56();

						each(div_51, 21, () => get(relations), (r) => r.id + r.relation, ($$anchor, r) => {
							var a_3 = root_55();
							var node_43 = child(a_3);

							{
								var consequent_44 = ($$anchor) => {
									var img_3 = root_31();

									template_effect(() => set_attribute(img_3, 'src', get(r).cover));
									append($$anchor, img_3);
								};

								var alternate_11 = ($$anchor) => {
									var span_13 = root_54();

									append($$anchor, span_13);
								};

								if_block(node_43, ($$render) => {
									if (get(r).cover) $$render(consequent_44); else $$render(alternate_11, -1);
								});
							}

							var small_3 = sibling(node_43, 2);
							var text_50 = only_child(small_3, true);
							var span_14 = sibling(small_3, 2);
							var text_51 = only_child(span_14, true);

							template_effect(
								($0) => {
									set_attribute(a_3, 'href', $0);
									set_text(text_50, REL_DE[get(r).relation] ?? get(r).relation);
									set_text(text_51, get(r).title);
								},
								[() => alUrl(get(r))]
							);

							append($$anchor, a_3);
						});
						append($$anchor, div_51);
					};

					var alternate_12 = ($$anchor) => {
						empty($$anchor, () => 'Keine Beziehungen vorhanden.');
					};

					if_block(node_42, ($$render) => {
						if (get(relations).length) $$render(consequent_45); else $$render(alternate_12, -1);
					});
				}

				var section_6 = sibling(section_5, 2);
				var node_44 = sibling(child(section_6), 2);

				charList(node_44, () => 8);

				var node_45 = sibling(node_44, 2);

				{
					var consequent_46 = ($$anchor) => {
						var button_6 = root_57();

						delegated('click', button_6, () => set(tab, 'characters'));
						append($$anchor, button_6);
					};

					if_block(node_45, ($$render) => {
						if ((get(det)?.characters.length ?? 0) > 8) $$render(consequent_46);
					});
				}

				var node_46 = sibling(section_6, 2);

				dists(node_46);

				var section_7 = sibling(node_46, 2);
				var node_47 = sibling(child(section_7), 2);

				{
					var consequent_49 = ($$anchor) => {
						var div_52 = root_56();

						each(div_52, 21, () => get(det).recommendations, (r) => r.id, ($$anchor, r) => {
							var a_4 = root_59();
							var node_48 = child(a_4);

							{
								var consequent_47 = ($$anchor) => {
									var img_4 = root_31();

									template_effect(() => set_attribute(img_4, 'src', get(r).cover));
									append($$anchor, img_4);
								};

								var alternate_13 = ($$anchor) => {
									var span_15 = root_54();

									append($$anchor, span_15);
								};

								if_block(node_48, ($$render) => {
									if (get(r).cover) $$render(consequent_47); else $$render(alternate_13, -1);
								});
							}

							var span_16 = sibling(node_48, 2);
							var text_52 = only_child(span_16, true);
							var node_49 = sibling(span_16, 2);

							{
								var consequent_48 = ($$anchor) => {
									var small_4 = root_58();
									var text_53 = only_child(small_4);

									template_effect(() => set_text(text_53, `${get(r).score ?? ''}%`));
									append($$anchor, small_4);
								};

								if_block(node_49, ($$render) => {
									if (get(r).score) $$render(consequent_48);
								});
							}

							template_effect(
								($0) => {
									set_attribute(a_4, 'href', $0);
									set_text(text_52, get(r).title);
								},
								[() => alUrl(get(r))]
							);

							append($$anchor, a_4);
						});
						append($$anchor, div_52);
					};

					var alternate_14 = ($$anchor) => {
						empty($$anchor, () => 'Keine Empfehlungen vorhanden.');
					};

					if_block(node_47, ($$render) => {
						if (get(det)?.recommendations.length) $$render(consequent_49); else $$render(alternate_14, -1);
					});
				}
				append($$anchor, fragment_10);
			};

			var consequent_51 = ($$anchor) => {
				var section_8 = root_61();
				var node_50 = child(section_8);

				charList(node_50, () => 24);
				append($$anchor, section_8);
			};

			var consequent_54 = ($$anchor) => {
				var section_9 = root_63();
				var node_51 = child(section_9);

				{
					var consequent_53 = ($$anchor) => {
						var div_53 = root_35();

						each(div_53, 21, () => get(det).staff, (s) => s.person.id + s.role, ($$anchor, s) => {
							var div_54 = root_62();
							var node_52 = child(div_54);

							{
								var consequent_52 = ($$anchor) => {
									var img_5 = root_31();

									template_effect(() => set_attribute(img_5, 'src', get(s).person.image));
									append($$anchor, img_5);
								};

								var alternate_15 = ($$anchor) => {
									var span_17 = root_32();
									var text_54 = only_child(span_17, true);

									template_effect(() => set_text(text_54, get(s).person.name[0]));
									append($$anchor, span_17);
								};

								if_block(node_52, ($$render) => {
									if (get(s).person.image) $$render(consequent_52); else $$render(alternate_15, -1);
								});
							}

							var div_55 = sibling(node_52, 2);
							var b_3 = child(div_55);
							var text_55 = only_child(b_3, true);
							var small_5 = sibling(b_3);
							var text_56 = only_child(small_5, true);

							template_effect(() => {
								set_text(text_55, get(s).person.name);
								set_text(text_56, get(s).role);
							});

							append($$anchor, div_54);
						});
						append($$anchor, div_53);
					};

					var alternate_16 = ($$anchor) => {
						empty($$anchor, () => 'Keine Mitwirkenden bei AniList.');
					};

					if_block(node_51, ($$render) => {
						if (get(det)?.staff.length) $$render(consequent_53); else $$render(alternate_16, -1);
					});
				}
				append($$anchor, section_9);
			};

			var alternate_17 = ($$anchor) => {
				var fragment_15 = root_64();
				var div_56 = first_child(fragment_15);
				var node_53 = child(div_56);

				dists(node_53);
				append($$anchor, fragment_15);
			};

			if_block(node_36, ($$render) => {
				if (get(tab) === 'overview') $$render(consequent_50); else if (get(tab) === 'characters') $$render(consequent_51, 1); else if (get(tab) === 'staff') $$render(consequent_54, 2); else $$render(alternate_17, -1);
			});
		}
	}

	var node_54 = sibling(div, 2);

	{
		var consequent_57 = ($$anchor) => {
			var fragment_16 = root_69();
			var div_57 = first_child(fragment_16);
			var div_58 = sibling(div_57, 2);
			var div_59 = child(div_58);
			var button_7 = sibling(child(div_59), 2);

			var div_60 = sibling(div_59, 2);
			var text_57 = only_child(div_60, true);
			var div_61 = sibling(div_60, 2);
			var div_62 = child(div_61);
			var div_63 = child(div_62);
			var select = sibling(child(div_63), 2);

			each(select, 21, () => WATCH, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_1)[0];
				let l = () => get($$array_1)[1];
				var option = root_65();
				var text_58 = only_child(option, true);
				var option_value = {};

				template_effect(() => {
					set_text(text_58, l());

					if (option_value !== (option_value = v())) {
						option.value = (option.__value = option_value) ?? '';
					}
				});

				append($$anchor, option);
			});
			init_select(select);

			var div_64 = sibling(div_63, 2);
			var input = sibling(child(div_64), 2);

			var div_65 = sibling(div_62, 2);
			var div_66 = child(div_65);
			var label = child(div_66);
			var node_55 = sibling(child(label));

			{
				var consequent_55 = ($$anchor) => {
					var span_18 = root_66();
					var text_59 = only_child(span_18);

					template_effect(() => set_text(text_59, `/ ${m.episodes ?? ''}`));
					append($$anchor, span_18);
				};

				if_block(node_55, ($$render) => {
					if (m.episodes) $$render(consequent_55);
				});
			}

			var input_1 = sibling(label, 2);

			var div_67 = sibling(div_66, 2);
			var input_2 = sibling(child(div_67), 2);

			var div_68 = sibling(div_65, 2);
			var div_69 = sibling(child(div_68), 2);

			each(div_69, 21, () => COLL, index, ($$anchor, $$item) => {
				var $$array_2 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_2)[0];
				let l = () => get($$array_2)[1];
				var button_8 = root_67();
				let classes_3;
				var text_60 = only_child(button_8, true);

				template_effect(() => {
					classes_3 = set_class(button_8, 1, 'svelte-90l7ri', null, classes_3, { on: get(fColl) === v() });
					set_text(text_60, l());
				});

				delegated('click', button_8, () => set(fColl, v(), true));
				append($$anchor, button_8);
			});

			var node_56 = sibling(div_68, 2);

			{
				var consequent_56 = ($$anchor) => {
					var div_70 = root_68();
					var input_3 = sibling(child(div_70), 2);
					bind_value(input_3, () => get(fLent), ($$value) => set(fLent, $$value));
					append($$anchor, div_70);
				};

				if_block(node_56, ($$render) => {
					if (get(fColl) === 'owned') $$render(consequent_56);
				});
			}

			var div_71 = sibling(node_56, 2);
			var div_72 = child(div_71);
			var input_4 = sibling(child(div_72), 2);

			var div_73 = sibling(div_72, 2);
			var input_5 = sibling(child(div_73), 2);

			var div_74 = sibling(div_71, 2);
			var textarea = sibling(child(div_74), 2);

			var div_75 = sibling(div_61, 2);
			var button_9 = child(div_75);
			var button_10 = sibling(button_9, 2);

			template_effect(() => {
				set_text(text_57, m.title);
				set_value(input, get(fScore) ?? '');
				set_value(input_1, get(fProgress) ?? '');
				set_value(input_2, get(fRepeats) ?? '');
			});

			delegated('click', div_57, () => set(editing, false));
			delegated('click', button_7, () => set(editing, false));
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
			delegated('click', button_9, () => set(editing, false));
			delegated('click', button_10, saveEdit);
			append($$anchor, fragment_16);
		};

		if_block(node_54, ($$render) => {
			if (get(editing)) $$render(consequent_57);
		});
	}

	template_effect(() => {
		set_attribute(div, 'aria-label', m.title);
		classes = set_class(div_1, 1, 'banner svelte-90l7ri', null, classes, { empty: !get(banner) });

		set_style(div_1, get(banner)
			? `background-image:url('${get(banner)}')`
			: get(art)?.color ? `background:${get(art).color}` : '');

		classes_1 = set_class(button_2, 1, 'fav svelte-90l7ri', null, classes_1, { on: get(fav) });
		set_text(text_4, m.title);
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

const __vite_glob_0_0 = "\"\"\"Anime-Liste backend — medien-agnostischer Tracker (Anime zuerst).\"\"\"\n";

const __vite_glob_0_1 = "\"\"\"KI-Konfiguration (Embedding-Modell): aus/Server/Extern. Gespeichert in meta_kv.\n\nModi:\n  server   — Ollama auf dem Backend-Rechner (Default bge-m3)\n  external — eigener Endpunkt (Ollama- oder OpenAI-kompatibel), z.B. anderer PC oder Anbieter\n  device   — kleines Modell auf dem Handy (noch nicht verfuegbar; kommt mit der Handy-Version)\nDer API-Schluessel wird nie an die Oberflaeche zurueckgegeben.\n\"\"\"\nfrom __future__ import annotations\n\nimport httpx\n\nfrom .db import repo\nfrom .sources import ollama\n\nKEYS = (\"ai_enabled\", \"ai_mode\", \"ai_ext_kind\", \"ai_ext_url\", \"ai_ext_model\", \"ai_ext_key\",\n        \"ai_index_model\", \"ai_index_dim\")\n\n\ndef _m(k: str, d: str = \"\") -> str:\n    v = repo.meta_get(k)\n    return d if v is None else v\n\n\ndef _embedded() -> int:\n    from . import embeddings\n    return embeddings.index_count().get(\"embedded\", 0)\n\n\ndef get() -> dict:\n    enabled = repo.meta_get(\"ai_enabled\")\n    if enabled is None:  # Altbestand: war schon indiziert → weiter aktiv; sonst aus\n        enabled = \"1\" if _embedded() > 0 else \"0\"\n    return {\n        \"enabled\": enabled == \"1\",\n        \"mode\": _m(\"ai_mode\", \"server\"),\n        \"ext_kind\": _m(\"ai_ext_kind\", \"openai\"),\n        \"ext_url\": _m(\"ai_ext_url\"),\n        \"ext_model\": _m(\"ai_ext_model\"),\n        \"ext_key_set\": bool(_m(\"ai_ext_key\")),\n        \"index_model\": _m(\"ai_index_model\") or (\"server:\" + ollama.EMBED_MODEL if _embedded() else \"\"),\n        \"index_dim\": int(_m(\"ai_index_dim\", \"0\") or 0),\n    }\n\n\ndef update(p: dict) -> dict:\n    mapping = {\"enabled\": \"ai_enabled\", \"mode\": \"ai_mode\", \"ext_kind\": \"ai_ext_kind\", \"ext_url\": \"ai_ext_url\",\n               \"ext_model\": \"ai_ext_model\", \"ext_key\": \"ai_ext_key\"}\n    for k, mk in mapping.items():\n        if k in p and p[k] is not None:\n            v = p[k]\n            if k == \"enabled\":\n                v = \"1\" if v else \"0\"\n            if k == \"ext_url\":\n                v = str(v).strip().rstrip(\"/\")\n            if k == \"mode\" and v not in (\"server\", \"external\", \"device\"):\n                raise ValueError(\"mode ungueltig\")\n            repo.meta_set(mk, str(v))\n    return get()\n\n\ndef model_id() -> str:\n    c = get()\n    if c[\"mode\"] == \"external\":\n        return f\"external:{c['ext_kind']}:{c['ext_model']}\"\n    if c[\"mode\"] == \"device\":\n        return \"device\"\n    return f\"server:{ollama.EMBED_MODEL}\"\n\n\ndef embed(texts: list[str]) -> list[list[float]]:\n    c = get()\n    if c[\"mode\"] == \"device\":\n        raise RuntimeError(\"Modell auf dem Handy ist noch nicht verfügbar\")\n    if c[\"mode\"] == \"server\":\n        r = httpx.post(f\"{ollama.OLLAMA}/api/embed\", json={\"model\": ollama.EMBED_MODEL, \"input\": texts}, timeout=180)\n        r.raise_for_status()\n        return r.json()[\"embeddings\"]\n    if not c[\"ext_url\"] or not c[\"ext_model\"]:\n        raise RuntimeError(\"Externer Endpunkt/Modell nicht eingetragen\")\n    if c[\"ext_kind\"] == \"ollama\":\n        r = httpx.post(f\"{c['ext_url']}/api/embed\", json={\"model\": c[\"ext_model\"], \"input\": texts}, timeout=180)\n        r.raise_for_status()\n        return r.json()[\"embeddings\"]\n    headers = {\"Authorization\": f\"Bearer {_m('ai_ext_key')}\"} if _m(\"ai_ext_key\") else {}\n    r = httpx.post(f\"{c['ext_url']}/v1/embeddings\", json={\"model\": c[\"ext_model\"], \"input\": texts},\n                   headers=headers, timeout=180)\n    r.raise_for_status()\n    return [d[\"embedding\"] for d in sorted(r.json()[\"data\"], key=lambda d: d[\"index\"])]\n\n\ndef test() -> dict:\n    try:\n        v = embed([\"Test\"])[0]\n        return {\"ok\": True, \"dim\": len(v), \"model\": model_id()}\n    except Exception as ex:\n        return {\"ok\": False, \"error\": str(ex)[:300]}\n\n\ndef check_ready() -> str | None:\n    \"\"\"None = bereit, sonst Fehlertext fuer die Oberflaeche.\"\"\"\n    c = get()\n    if not c[\"enabled\"]:\n        return \"KI-Funktionen sind deaktiviert (Einstellungen → KI)\"\n    if c[\"mode\"] == \"device\":\n        return \"Modell auf dem Handy noch nicht verfügbar\"\n    if c[\"index_model\"] != model_id():\n        return \"Der Index passt nicht zum gewählten Modell — in den Einstellungen neu aufbauen\"\n    return None\n";

const __vite_glob_0_2 = "\"\"\"AniList → eigene DB: Zusatzdaten aus dem OEFFENTLICHEN Profil (kein Token noetig).\n\nReichert vorhandene Titel an (Tags, Studios, Saison, Land, Quelle, naechste Folge) und uebernimmt\nStart-/Enddatum, Rewatches und Favoriten. Ueberschreibt NIE Status/Wertung/Fortschritt.\nNur space='normal' (H wird nie angefasst).\n\"\"\"\nfrom __future__ import annotations\n\nimport json\n\nimport httpx\n\nfrom .db import connect\n\nENDPOINT = \"https://graphql.anilist.co\"\nLIST_Q = \"\"\"\nquery ($u: String) {\n  MediaListCollection(userName: $u, type: ANIME) { lists { entries {\n    repeat startedAt{year month day} completedAt{year month day}\n    media { id season countryOfOrigin source\n      tags { name rank isGeneralSpoiler isMediaSpoiler }\n      studios { nodes { name isAnimationStudio } }\n      nextAiringEpisode { episode airingAt } } } } }\n}\"\"\"\nFAV_Q = \"\"\"\nquery ($u: String, $p: Int) {\n  User(name: $u) { favourites { anime(page: $p, perPage: 25) { pageInfo { hasNextPage } nodes { id } } } }\n}\"\"\"\n\n\ndef _post(q: str, v: dict) -> dict:\n    r = httpx.post(ENDPOINT, json={\"query\": q, \"variables\": v}, timeout=60)\n    r.raise_for_status()\n    d = r.json()\n    if d.get(\"errors\"):\n        raise RuntimeError(d[\"errors\"][0].get(\"message\", \"AniList-Fehler\"))\n    return d[\"data\"]\n\n\ndef _date(d: dict | None) -> str | None:\n    if not d or not d.get(\"year\"):\n        return None\n    return f\"{d['year']:04d}-{(d.get('month') or 1):02d}-{(d.get('day') or 1):02d}\"\n\n\ndef run(username: str) -> dict:\n    lists = _post(LIST_Q, {\"u\": username})[\"MediaListCollection\"][\"lists\"]\n    favs: list[int] = []\n    page = 1\n    while True:\n        a = _post(FAV_Q, {\"u\": username, \"p\": page})[\"User\"][\"favourites\"][\"anime\"]\n        favs += [n[\"id\"] for n in a[\"nodes\"]]\n        if not a[\"pageInfo\"][\"hasNextPage\"]:\n            break\n        page += 1\n\n    con = connect()\n    ids = {r[\"anilist_id\"]: r[\"id\"] for r in con.execute(\n        \"SELECT id, anilist_id FROM media WHERE space='normal' AND anilist_id IS NOT NULL\")}\n    enriched = missing = 0\n    seen: set[int] = set()\n    for lst in lists:\n        for e in lst[\"entries\"]:\n            m = e[\"media\"]\n            mid = ids.get(m[\"id\"])\n            if mid is None:\n                missing += 1\n                continue\n            if m[\"id\"] in seen:\n                continue\n            seen.add(m[\"id\"])\n            tags = [t[\"name\"] for t in (m.get(\"tags\") or [])\n                    if t[\"rank\"] >= 50 and not t[\"isGeneralSpoiler\"] and not t[\"isMediaSpoiler\"]]\n            studios = list(dict.fromkeys(s[\"name\"] for s in (m.get(\"studios\") or {}).get(\"nodes\", []) if s[\"isAnimationStudio\"]))\n            na = m.get(\"nextAiringEpisode\") or {}\n            con.execute(\n                \"UPDATE media SET tags=?, studios=?, season=?, country=?, source=?, \"\n                \"next_airing_ep=?, next_airing_at=? WHERE id=?\",\n                (json.dumps(tags), json.dumps(studios), m.get(\"season\"), m.get(\"countryOfOrigin\"),\n                 m.get(\"source\"), na.get(\"episode\"), na.get(\"airingAt\"), mid))\n            con.execute(\"INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)\", (mid,))\n            con.execute(\"UPDATE user_entry SET started_at=?, completed_at=?, rewatches=? WHERE media_id=?\",\n                        (_date(e.get(\"startedAt\")), _date(e.get(\"completedAt\")), e.get(\"repeat\") or 0, mid))\n            enriched += 1\n\n    # Favoriten: vorhandene lokale Rangfolge bleibt; fehlende werden hinten angehaengt.\n    have = con.execute(\"SELECT COUNT(*) c FROM user_entry WHERE favorite=1\").fetchone()[\"c\"]\n    nxt = (con.execute(\"SELECT COALESCE(MAX(favorite_order),-1)+1 n FROM user_entry WHERE favorite=1\").fetchone()[\"n\"])\n    fav_new = 0\n    for i, aid in enumerate(favs):\n        mid = ids.get(aid)\n        if mid is None:\n            continue\n        con.execute(\"INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)\", (mid,))\n        cur = con.execute(\"SELECT favorite FROM user_entry WHERE media_id=?\", (mid,)).fetchone()\n        if cur[\"favorite\"]:\n            continue\n        order = i if have == 0 else nxt\n        nxt += 1\n        con.execute(\"UPDATE user_entry SET favorite=1, favorite_order=? WHERE media_id=?\", (order, mid))\n        fav_new += 1\n    con.execute(\"INSERT OR REPLACE INTO meta_kv (key, value) VALUES ('anilist_username', ?)\", (username,))\n    con.commit()\n    con.close()\n    return {\"status\": \"ok\", \"enriched\": enriched, \"not_in_catalog\": missing,\n            \"favorites_on_anilist\": len(favs), \"favorites_added\": fav_new}\n";

const __vite_glob_0_3 = "\"\"\"Zugangsschutz fuers Backend.\n\n* Ohne gesetztes Passwort: nur Zugriffe von localhost (127.0.0.1/::1) — wie bisher.\n* Mit Passwort: jede Anfrage braucht den Zugangsschluessel (Header ``X-Orbitlist-Key`` oder\n  ``Authorization: Bearer``). Den Schluessel bekommt man per ``POST /auth/login`` gegen das Passwort.\n  Er ist ein HMAC ueber ein geheimes Serverkennwort und wird bei Passwortwechsel ungueltig.\n* Passwort wird nur als scrypt-Hash gespeichert. Setzen: ``python -m app.auth`` (fragt interaktiv)\n  oder Umgebungsvariable ORBITLIST_PASSWORD beim Start (wird gehasht, nicht gespeichert).\n\"\"\"\nfrom __future__ import annotations\n\nimport hashlib\nimport hmac\nimport os\nimport secrets\nimport time\nfrom collections import defaultdict, deque\n\nfrom .db import repo\n\nPUBLIC_PATHS = (\"/health\", \"/catalog/slim.db.gz\", \"/auth/status\", \"/auth/login\", \"/app\", \"/docs\", \"/openapi.json\")\nLOOPBACK = {\"127.0.0.1\", \"::1\", \"localhost\"}\n_fail: dict[str, deque] = defaultdict(deque)\n\n\ndef _scrypt(pw: str, salt: bytes) -> str:\n    return hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32).hex()\n\n\ndef set_password(pw: str) -> None:\n    if len(pw) < 8:\n        raise ValueError(\"Passwort: mindestens 8 Zeichen\")\n    salt = secrets.token_bytes(16)\n    repo.meta_set(\"auth_salt\", salt.hex())\n    repo.meta_set(\"auth_hash\", _scrypt(pw, salt))\n    repo.meta_set(\"auth_secret\", secrets.token_hex(32))  # rotiert → alte Schluessel ungueltig\n\n\ndef clear_password() -> None:\n    for k in (\"auth_salt\", \"auth_hash\", \"auth_secret\"):\n        repo.meta_set(k, \"\")\n\n\ndef is_required() -> bool:\n    return bool(repo.meta_get(\"auth_hash\"))\n\n\ndef apply_env() -> None:\n    \"\"\"ORBITLIST_PASSWORD beim Start uebernehmen (nur wenn es sich vom gespeicherten unterscheidet).\"\"\"\n    pw = os.environ.get(\"ORBITLIST_PASSWORD\")\n    if not pw:\n        return\n    salt_hex, h = repo.meta_get(\"auth_salt\"), repo.meta_get(\"auth_hash\")\n    if salt_hex and h and hmac.compare_digest(_scrypt(pw, bytes.fromhex(salt_hex)), h):\n        return\n    set_password(pw)\n\n\ndef _key() -> str:\n    return hmac.new(repo.meta_get(\"auth_secret\").encode(), b\"orbitlist-access\", hashlib.sha256).hexdigest()\n\n\ndef login(pw: str, client: str) -> str | None:\n    now = time.time()\n    q = _fail[client]\n    while q and now - q[0] > 60:\n        q.popleft()\n    if len(q) >= 5:\n        raise PermissionError(\"zu viele Versuche — bitte eine Minute warten\")\n    salt_hex, h = repo.meta_get(\"auth_salt\"), repo.meta_get(\"auth_hash\")\n    if not (salt_hex and h) or not hmac.compare_digest(_scrypt(pw, bytes.fromhex(salt_hex)), h):\n        q.append(now)\n        return None\n    return _key()\n\n\ndef check(path: str, client: str, key: str | None, method: str) -> tuple[int, str] | None:\n    \"\"\"None = erlaubt, sonst (Status, Meldung).\"\"\"\n    if method == \"OPTIONS\" or any(path == p or path.startswith(p + \"/\") for p in PUBLIC_PATHS):\n        return None\n    if not is_required():\n        if client in LOOPBACK:\n            return None\n        return 403, \"Kein Passwort gesetzt — Zugriff von aussen gesperrt. Setzen mit: python -m app.auth\"\n    if key and hmac.compare_digest(key, _key()):\n        return None\n    return 401, \"Zugangsschluessel fehlt oder ungueltig\"\n\n\nif __name__ == \"__main__\":\n    import getpass\n    import sys\n\n    if \"--entfernen\" in sys.argv:\n        clear_password()\n        print(\"Passwort entfernt (nur noch localhost).\")\n    else:\n        a, b = getpass.getpass(\"Neues Passwort: \"), getpass.getpass(\"Wiederholen: \")\n        if a != b:\n            sys.exit(\"Passwoerter ungleich\")\n        set_password(a)\n        print(\"Passwort gesetzt. Backend neu starten ist nicht noetig.\")\n";

const __vite_glob_0_4 = "\"\"\"Verfuegbarkeit: dt. Synchro-Historie (MyDubList = Wahrheit, Synchronkartei-Link) +\n'wo legal' via TMDB (offiziell; Stub ohne Key). JustWatch bewusst NICHT (AGB).\"\"\"\nfrom __future__ import annotations\n\nimport os\nfrom urllib.parse import quote\n\nimport httpx\n\n\ndef synchronkartei_search(title: str) -> str:\n    return f\"https://www.synchronkartei.de/?q={quote(title)}\"\n\n\ndef tmdb_providers(title: str) -> dict:\n    key = os.environ.get(\"TMDB_API_KEY\")\n    if not key:\n        return {\"status\": \"stub\", \"note\": \"TMDB_API_KEY nicht gesetzt — braucht Jonas' Key\", \"providers\": []}\n    try:\n        s = httpx.get(\n            \"https://api.themoviedb.org/3/search/tv\",\n            params={\"api_key\": key, \"query\": title, \"language\": \"de-DE\"},\n            timeout=20,\n        ).json()\n        if not s.get(\"results\"):\n            return {\"status\": \"ok\", \"providers\": []}\n        tid = s[\"results\"][0][\"id\"]\n        wp = httpx.get(\n            f\"https://api.themoviedb.org/3/tv/{tid}/watch/providers\", params={\"api_key\": key}, timeout=20\n        ).json()\n        de = (wp.get(\"results\") or {}).get(\"DE\") or {}\n        provs = []\n        for kind in (\"flatrate\", \"buy\", \"rent\"):\n            for p in de.get(kind, []):\n                provs.append({\"name\": p.get(\"provider_name\"), \"type\": kind})\n        return {\"status\": \"ok\", \"link\": de.get(\"link\"), \"providers\": provs}\n    except Exception as e:\n        return {\"status\": \"error\", \"note\": str(e), \"providers\": []}\n\n\ndef availability(m: dict) -> dict:\n    title = m.get(\"title_english\") or m.get(\"title_romaji\") or m.get(\"title\") or \"\"\n    return {\n        \"dubbed_de\": bool(m.get(\"dub_de\")),\n        \"dub_tier\": m.get(\"dub_tier\"),\n        \"dub_source\": \"MyDubList (CC BY 4.0)\",\n        \"synchronkartei_search\": synchronkartei_search(title),\n        \"legal\": tmdb_providers(title),\n    }\n";

const __vite_glob_0_5 = "\"\"\"Katalog-Import aus der eigenen offenen Datenbank (orbit-anime-db, anime.jsonl).\n\nAdditiv und nicht-destruktiv: bestehende Eintraege (und damit user_entry) werden nie geloescht oder\nersetzt. Zuordnung ueber AniList-ID (Verweis), sonst eindeutige MAL-/aniSearch-ID, sonst neuer Eintrag.\nBestehende Eintraege ohne Gegenstueck bleiben, erkennbar an ``oadb_id IS NULL`` (nicht geraten).\n\nAufruf:  python -m app.catalog [pfad/zu/anime.jsonl] [--db KOPIE.db]\n\"\"\"\nfrom __future__ import annotations\n\nimport json\nimport os\nimport sqlite3\nimport sys\nfrom pathlib import Path\n\nDEFAULT_JSONL = Path(os.environ.get(\"OADB_JSONL\", Path.home() / \"projects/orbit-anime-db/data/anime.jsonl\"))\n\nFORMAT = {\"tv\": \"TV\", \"movie\": \"MOVIE\", \"ova\": \"OVA\", \"ona\": \"ONA\", \"special\": \"SPECIAL\"}\nSTATUS = {\"announced\": \"NOT_YET_RELEASED\", \"upcoming\": \"NOT_YET_RELEASED\", \"airing\": \"RELEASING\", \"finished\": \"FINISHED\"}\n# AniList-/MAL-Genre-Vokabular; alles andere aus der Quelle sind Themen/Tags\nGENRES = {\n    \"action\": \"Action\", \"adventure\": \"Adventure\", \"comedy\": \"Comedy\", \"drama\": \"Drama\", \"ecchi\": \"Ecchi\",\n    \"fantasy\": \"Fantasy\", \"horror\": \"Horror\", \"mahou shoujo\": \"Mahou Shoujo\", \"mecha\": \"Mecha\", \"music\": \"Music\",\n    \"mystery\": \"Mystery\", \"psychological\": \"Psychological\", \"romance\": \"Romance\", \"sci-fi\": \"Sci-Fi\",\n    \"science fiction\": \"Sci-Fi\", \"slice of life\": \"Slice of Life\", \"sports\": \"Sports\", \"sport\": \"Sports\",\n    \"supernatural\": \"Supernatural\", \"thriller\": \"Thriller\", \"hentai\": \"Hentai\",\n}\n\nNEW_COLS = [(\"media\", \"oadb_id\", \"TEXT\"), (\"media\", \"kitsu_id\", \"INTEGER\")]\n\n\ndef _titlecase(s: str) -> str:\n    return \" \".join(w.capitalize() if not w.isupper() else w for w in s.split())\n\n\ndef _split_genres(raw: list[str]) -> tuple[list[str], list[str]]:\n    genres: list[str] = []\n    tags: list[str] = []\n    for g in raw or []:\n        k = g.strip().lower()\n        if not k:\n            continue\n        if k in GENRES:\n            v = GENRES[k]\n            if v not in genres:\n                genres.append(v)\n        else:\n            v = _titlecase(k)\n            if v not in tags:\n                tags.append(v)\n    return genres, tags\n\n\ndef _info_links(ids: dict, website: str | None) -> dict:\n    links = {}\n    if ids.get(\"anilist\"):\n        links[\"anilist\"] = f\"https://anilist.co/anime/{ids['anilist']}\"\n    if ids.get(\"mal\"):\n        links[\"mal\"] = f\"https://myanimelist.net/anime/{ids['mal']}\"\n    if ids.get(\"anisearch\"):\n        links[\"anisearch\"] = f\"https://www.anisearch.com/anime/{ids['anisearch']}\"\n    if ids.get(\"kitsu\"):\n        links[\"kitsu\"] = f\"https://kitsu.app/anime/{ids['kitsu']}\"\n    if ids.get(\"wikipedia_en\"):\n        links[\"wikipedia\"] = f\"https://en.wikipedia.org/wiki/{str(ids['wikipedia_en']).replace(' ', '_')}\"\n    if website:\n        links[\"website\"] = website\n    return links\n\n\n# Stufen aus MyDubList; fuer die Mehrsprachen-Liste zaehlt wie bisher \"high\" und besser\nDUB_LANG_TIERS = (\"very-high\", \"high\")\nDUB_ATTRIBUTION = \"Dub data © MyDubList - https://mydublist.com - (CC BY 4.0)\"\n\n\ndef _dub_fields(r: dict) -> dict:\n    \"\"\"Feld `dubs` der offenen Datenbank → dub_de / dub_tier / dub_languages (leer, wenn keine Angabe).\"\"\"\n    langs = ((r.get(\"dubs\") or {}).get(\"languages\")) or {}\n    if not langs:\n        return {}\n    de = langs.get(\"german\")\n    return {\n        \"dub_de\": 1 if de else 0,\n        \"dub_tier\": de,\n        \"dub_languages\": sorted(l for l, t in langs.items() if t in DUB_LANG_TIERS),\n    }\n\n\ndef _fame(r: dict, dub: dict) -> int:\n    \"\"\"Bekanntheits-Naeherung ohne Nutzerzahlen (der offene Katalog hat keine): viele Querverweise, Synchro und\n    Beschreibung deuten auf bekannte Titel. Nur zum Sortieren; echte AniList-Zahlen (falls vorhanden) haben Vorrang.\"\"\"\n    ids = [v for k, v in (r.get(\"ids\") or {}).items() if v and k != \"wikidata\"]\n    score = 10 * len(ids) + 20 * len(dub.get(\"dub_languages\") or []) + (40 if dub.get(\"dub_de\") else 0)\n    if (r.get(\"synopsis\") or {}).get(\"text\"):\n        score += 30\n    if r.get(\"type\") in (\"tv\", \"movie\"):\n        score += 15\n    eps = r.get(\"episodes\") or 0\n    score += 5 if eps else 0\n    score += min(eps, 120) // 6  # lange Serien sind meist bekannter\n    score += 2 * min(len((r.get(\"title\") or {}).get(\"synonyms\") or []), 8)  # viele Titelvarianten\n    return score\n\n\ndef _row_from_record(r: dict) -> dict:\n    ids = r.get(\"ids\") or {}\n    t = r.get(\"title\") or {}\n    season = r.get(\"season\") or {}\n    genres, tags = _split_genres(r.get(\"genres\") or [])\n    syn = [s for s in (t.get(\"synonyms\") or []) if s]\n    syn_text = (r.get(\"synopsis\") or {}).get(\"text\")\n    start = r.get(\"start_date\") or \"\"\n    year = season.get(\"year\") or (int(start[:4]) if start[:4].isdigit() else None)\n    adult = 1 if \"Hentai\" in genres else 0\n    titles = [t.get(\"romaji\"), t.get(\"en\"), t.get(\"ja\")]\n    return {\n        \"oadb_id\": r[\"id\"],\n        \"space\": \"h\" if adult else \"normal\",\n        \"is_adult\": adult,\n        \"anilist_id\": ids.get(\"anilist\"),\n        \"mal_id\": ids.get(\"mal\"),\n        \"anisearch_id\": ids.get(\"anisearch\"),\n        \"kitsu_id\": ids.get(\"kitsu\"),\n        \"title_romaji\": t.get(\"romaji\") or t.get(\"en\"),\n        \"title_english\": t.get(\"en\"),\n        \"title_native\": t.get(\"ja\"),\n        \"synonyms\": syn,\n        \"format\": FORMAT.get(r.get(\"type\")),\n        \"status\": STATUS.get(r.get(\"status\")),\n        \"episodes\": r.get(\"episodes\"),\n        \"season_year\": year,\n        \"season\": (season.get(\"season\") or \"\").upper() or None,\n        \"genres\": genres,\n        \"tags\": tags,\n        \"studios\": r.get(\"studios\") or [],\n        \"description_en\": syn_text,\n        \"info_links\": _info_links(ids, r.get(\"website\")),\n        \"search_blob\": \" | \".join(x.lower() for x in titles + syn if x),\n        **_dub_fields(r),\n        \"popularity\": _fame(r, _dub_fields(r)),\n    }\n\n\ndef _j(v):\n    return json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v\n\n\ndef run(jsonl: Path = DEFAULT_JSONL, db: Path | None = None, progress=print) -> dict:\n    from . import db as dbmod\n\n    path = Path(db) if db else dbmod.DB_PATH\n    con = sqlite3.connect(path)\n    con.row_factory = sqlite3.Row\n    con.execute(\"PRAGMA foreign_keys=ON\")\n    for tbl, col, typ in NEW_COLS:\n        try:\n            con.execute(f\"ALTER TABLE {tbl} ADD COLUMN {col} {typ}\")\n        except sqlite3.OperationalError:\n            pass\n    con.execute(\"CREATE UNIQUE INDEX IF NOT EXISTS ux_media_oadb ON media(oadb_id) WHERE oadb_id IS NOT NULL\")\n    con.commit()\n\n    before = {\n        \"media\": con.execute(\"SELECT COUNT(*) FROM media\").fetchone()[0],\n        \"user_entry\": con.execute(\"SELECT COUNT(*) FROM user_entry\").fetchone()[0],\n    }\n\n    by_oadb, by_ani, by_mal, by_anis = {}, {}, {}, {}\n    mal_cnt: dict[int, int] = {}\n    for r in con.execute(\"SELECT id, oadb_id, anilist_id, mal_id, anisearch_id FROM media\"):\n        if r[\"oadb_id\"]:\n            by_oadb[r[\"oadb_id\"]] = r[\"id\"]\n        if r[\"anilist_id\"]:\n            by_ani[r[\"anilist_id\"]] = r[\"id\"]\n        if r[\"mal_id\"]:\n            mal_cnt[r[\"mal_id\"]] = mal_cnt.get(r[\"mal_id\"], 0) + 1\n            by_mal[r[\"mal_id\"]] = r[\"id\"]\n        if r[\"anisearch_id\"]:\n            by_anis[r[\"anisearch_id\"]] = r[\"id\"]\n    by_mal = {k: v for k, v in by_mal.items() if mal_cnt[k] == 1}\n\n    claimed: set[int] = set()\n    stats = {\"matched\": 0, \"created\": 0, \"created_h\": 0, \"skipped_dup\": 0, \"status_refreshed\": 0, \"dubs\": 0}\n\n    fill_cols = [\"title_romaji\", \"title_english\", \"title_native\", \"format\", \"episodes\", \"season_year\", \"season\",\n                 \"description_en\", \"mal_id\", \"anisearch_id\", \"kitsu_id\", \"popularity\"]\n    fill_json = [\"synonyms\", \"genres\", \"tags\", \"studios\", \"info_links\"]\n\n    n = 0\n    for line in open(jsonl, encoding=\"utf-8\"):\n        rec = json.loads(line)\n        row = _row_from_record(rec)\n        stats[\"dubs\"] += \"dub_de\" in row\n        mid = by_oadb.get(row[\"oadb_id\"])\n        if mid is None and row[\"anilist_id\"]:\n            mid = by_ani.get(row[\"anilist_id\"])\n        elif mid is None:\n            mid = (by_mal.get(row[\"mal_id\"]) if row[\"mal_id\"] else None) or (\n                by_anis.get(row[\"anisearch_id\"]) if row[\"anisearch_id\"] else None)\n        if mid is not None and mid in claimed:\n            stats[\"skipped_dup\"] += 1\n            continue\n\n        if mid is not None:\n            cur = con.execute(\"SELECT * FROM media WHERE id=?\", (mid,)).fetchone()\n            sets, vals = [\"oadb_id=?\"], [row[\"oadb_id\"]]\n            for c in fill_cols:\n                if row.get(c) is not None and cur[c] in (None, \"\"):\n                    sets.append(f\"{c}=?\")\n                    vals.append(row[c])\n            for c in fill_json:\n                if row.get(c) and not cur[c] or (row.get(c) and cur[c] in (\"[]\", \"{}\")):\n                    sets.append(f\"{c}=?\")\n                    vals.append(_j(row[c]))\n            # Synchro-Angaben sind eine Momentaufnahme der Quelle → immer aktualisieren (nur wenn die Quelle etwas sagt)\n            for c in (\"dub_de\", \"dub_tier\", \"dub_languages\"):\n                if c in row:\n                    sets.append(f\"{c}=?\")\n                    vals.append(_j(row[c]))\n            # Status nur nachziehen, solange er sich aendern kann (laufend / angekuendigt)\n            if row[\"status\"] and cur[\"status\"] in (\"RELEASING\", \"NOT_YET_RELEASED\", None) and row[\"status\"] != cur[\"status\"]:\n                sets.append(\"status=?\")\n                vals.append(row[\"status\"])\n                stats[\"status_refreshed\"] += 1\n                if row[\"episodes\"]:\n                    sets.append(\"episodes=?\")\n                    vals.append(row[\"episodes\"])\n            con.execute(f\"UPDATE media SET {', '.join(sets)} WHERE id=?\", vals + [mid])\n            claimed.add(mid)\n            stats[\"matched\"] += 1\n        else:\n            cols = [\"oadb_id\", \"space\", \"media_type\", \"is_adult\", \"anilist_id\", \"mal_id\", \"anisearch_id\", \"kitsu_id\",\n                    \"title_romaji\", \"title_english\", \"title_native\", \"synonyms\", \"format\", \"status\", \"episodes\",\n                    \"season_year\", \"season\", \"genres\", \"tags\", \"studios\", \"description_en\", \"info_links\", \"search_blob\",\n                    \"dub_de\", \"dub_tier\", \"dub_languages\", \"popularity\"]\n            vals = [_j(row.get(c)) if c != \"media_type\" else \"anime\" for c in cols]\n            vals[cols.index(\"dub_de\")] = row.get(\"dub_de\", 0)\n            try:\n                cur = con.execute(f\"INSERT INTO media ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})\", vals)\n            except sqlite3.IntegrityError:\n                # MAL-ID schon vergeben (anderer Eintrag ohne AniList-ID) → ohne MAL-ID anlegen\n                vals[cols.index(\"mal_id\")] = None\n                cur = con.execute(f\"INSERT INTO media ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})\", vals)\n            claimed.add(cur.lastrowid)\n            stats[\"created\"] += 1\n            stats[\"created_h\"] += row[\"is_adult\"]\n        n += 1\n        if n % 5000 == 0:\n            con.commit()\n            progress(f\"  {n} Titel verarbeitet\")\n\n    con.execute(\"INSERT OR REPLACE INTO meta_kv(key, value) VALUES ('last_catalog_import', datetime('now'))\")\n    if stats[\"dubs\"]:\n        con.execute(\"INSERT OR REPLACE INTO meta_kv(key, value) VALUES ('dub_attribution', ?)\", (DUB_ATTRIBUTION,))\n    con.commit()\n\n    after = {\n        \"media\": con.execute(\"SELECT COUNT(*) FROM media\").fetchone()[0],\n        \"user_entry\": con.execute(\"SELECT COUNT(*) FROM user_entry\").fetchone()[0],\n        \"ohne_gegenstueck\": con.execute(\"SELECT COUNT(*) FROM media WHERE oadb_id IS NULL\").fetchone()[0],\n        \"ohne_gegenstueck_in_liste\": con.execute(\n            \"SELECT COUNT(*) FROM media m JOIN user_entry u ON u.media_id=m.id WHERE m.oadb_id IS NULL\").fetchone()[0],\n        \"verwaiste_listeneintraege\": con.execute(\n            \"SELECT COUNT(*) FROM user_entry u LEFT JOIN media m ON m.id=u.media_id WHERE m.id IS NULL\").fetchone()[0],\n    }\n    con.close()\n    res = {\"vorher\": before, \"nachher\": after, **stats}\n    progress(json.dumps(res, ensure_ascii=False, indent=1))\n    return res\n\n\nif __name__ == \"__main__\":\n    args = [a for a in sys.argv[1:] if not a.startswith(\"--\")]\n    dbarg = None\n    if \"--db\" in sys.argv:\n        dbarg = sys.argv[sys.argv.index(\"--db\") + 1]\n        args = [a for a in args if a != dbarg]\n    run(Path(args[0]) if args else DEFAULT_JSONL, dbarg)\n";

const __vite_glob_0_6 = "\"\"\"Datenhaltung + Datenzugriffs-Schicht (abstrahiert: Remote/lokal).\n\nDie API spricht nur gegen ``MediaRepo`` (abstrakt). Das Backend nutzt ``SqliteRepo``.\nEin spaeteres Orbit-Plugin im lokalen Modus kann dieselbe Schnittstelle gegen\nIndexedDB implementieren — darum ist hier bewusst eine schmale Repo-API definiert.\n\"\"\"\nfrom __future__ import annotations\n\nimport json\nimport os\nimport sqlite3\nfrom abc import ABC, abstractmethod\nfrom pathlib import Path\nfrom typing import Any, Optional\n\ntry:  # sqlite-vec ist optional (erst ab Meilenstein C fuer Embeddings gebraucht)\n    import sqlite_vec\n    HAVE_VEC = True\nexcept Exception:  # pragma: no cover\n    HAVE_VEC = False\n\nDB_PATH = Path(\n    os.environ.get(\"ANIME_DB\", Path(__file__).resolve().parent.parent / \"data\" / \"anime.db\")\n)\n\n# space = 'normal' (Anime) | 'h' (Hentai, versteckt). media_type = anime|manga|book|...\nSCHEMA = \"\"\"\nCREATE TABLE IF NOT EXISTS media (\n  id            INTEGER PRIMARY KEY AUTOINCREMENT,\n  space         TEXT NOT NULL DEFAULT 'normal',\n  media_type    TEXT NOT NULL DEFAULT 'anime',\n  anilist_id    INTEGER,\n  mal_id        INTEGER,\n  anisearch_id  INTEGER,\n  title_romaji  TEXT,\n  title_english TEXT,\n  title_native  TEXT,\n  title_de      TEXT,\n  synonyms      TEXT,            -- JSON array\n  format        TEXT,\n  status        TEXT,\n  episodes      INTEGER,\n  season_year   INTEGER,\n  genres        TEXT,            -- JSON array\n  tags          TEXT,            -- JSON array\n  is_adult      INTEGER DEFAULT 0,\n  popularity    INTEGER,\n  average_score INTEGER,\n  cover_url     TEXT,\n  banner_url    TEXT,\n  color         TEXT,\n  description_en TEXT,\n  description_de TEXT,\n  dub_de        INTEGER DEFAULT 0,\n  dub_tier      TEXT,\n  dub_languages TEXT,            -- JSON array von Sprachen mit Dub\n  info_links    TEXT,            -- JSON object\n  search_blob   TEXT,            -- lowercase Titel+Synonyme fuer Findbarkeit\n  created_at    TEXT DEFAULT (datetime('now')),\n  updated_at    TEXT DEFAULT (datetime('now'))\n);\nCREATE UNIQUE INDEX IF NOT EXISTS ux_media_anilist ON media(space, anilist_id) WHERE anilist_id IS NOT NULL;\nCREATE UNIQUE INDEX IF NOT EXISTS ux_media_mal ON media(space, mal_id) WHERE anilist_id IS NULL AND mal_id IS NOT NULL;\nCREATE INDEX IF NOT EXISTS ix_media_space_type ON media(space, media_type);\nCREATE INDEX IF NOT EXISTS ix_media_pop ON media(popularity DESC);\n\nCREATE TABLE IF NOT EXISTS user_entry (\n  media_id     INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,\n  rating       INTEGER,          -- 1..10\n  note         TEXT,             -- eigenes Beschreibungsfeld\n  watch_status TEXT DEFAULT 'none',  -- none|watching|completed|dropped|paused|planning\n  progress     INTEGER DEFAULT 0,\n  collection   TEXT DEFAULT 'none', -- none|wish|owned\n  lent_to      TEXT,\n  lent_since   TEXT,\n  updated_at   TEXT DEFAULT (datetime('now'))\n);\n\nCREATE TABLE IF NOT EXISTS services (\n  id         INTEGER PRIMARY KEY AUTOINCREMENT,\n  name       TEXT NOT NULL,\n  url_schema TEXT NOT NULL,       -- enthaelt {slug}\n  logo       TEXT,\n  space      TEXT DEFAULT 'normal',\n  enabled    INTEGER DEFAULT 1\n);\n\nCREATE TABLE IF NOT EXISTS meta_kv (key TEXT PRIMARY KEY, value TEXT);\n\n-- Wo ein Titel nachweislich schaubar ist (nur Treffer; vom Geraet geprueft: Direktlink aufloesbar bzw. AniList-Streaming-Link)\nCREATE TABLE IF NOT EXISTS streaming (\n  media_id   INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,\n  service    TEXT NOT NULL,\n  url        TEXT,\n  source     TEXT,             -- 'direct' (Schema-Link aufgeloest) | 'anilist'\n  checked_at TEXT DEFAULT (datetime('now')),\n  PRIMARY KEY (media_id, service)\n);\n\n-- Medientyp-Configs (= der Dropdown-Umschalter neben dem Logo). hidden=1 → nur nach H-Entsperren.\nCREATE TABLE IF NOT EXISTS media_types (\n  slug        TEXT PRIMARY KEY,\n  name        TEXT NOT NULL,\n  description TEXT,\n  space       TEXT NOT NULL DEFAULT 'normal',   -- 'normal' | 'h'\n  media_type  TEXT NOT NULL DEFAULT 'anime',     -- Filter auf media.media_type\n  hidden      INTEGER DEFAULT 0,\n  enabled     INTEGER DEFAULT 1,\n  sort_order  INTEGER DEFAULT 0,\n  deletable   INTEGER DEFAULT 1\n);\n\"\"\"\n\nJSON_FIELDS = {\"synonyms\", \"genres\", \"tags\", \"studios\", \"info_links\", \"dub_languages\"}\n\n\ndef connect() -> sqlite3.Connection:\n    DB_PATH.parent.mkdir(parents=True, exist_ok=True)\n    con = sqlite3.connect(DB_PATH)\n    con.row_factory = sqlite3.Row\n    con.execute(f\"PRAGMA journal_mode={os.environ.get('ORBITLIST_JOURNAL', 'WAL')}\")  # eingebettet (Handy): DELETE\n    con.execute(\"PRAGMA foreign_keys=ON\")\n    try:\n        con.enable_load_extension(True)\n        if HAVE_VEC:\n            sqlite_vec.load(con)\n        con.enable_load_extension(False)\n    except Exception:\n        pass\n    return con\n\n\ndef init_db() -> None:\n    con = connect()\n    con.executescript(SCHEMA)\n    # Migration: mal_id-Unique nur noch für Zeilen OHNE anilist_id (z.B. H aus Jikan).\n    # Verschiedene AniList-Anime (Staffeln) dürfen sich eine idMal teilen → sonst Import-Crash.\n    con.execute(\"DROP INDEX IF EXISTS ux_media_mal\")\n    con.execute(\n        \"CREATE UNIQUE INDEX ux_media_mal ON media(space, mal_id) WHERE anilist_id IS NULL AND mal_id IS NOT NULL\"\n    )\n    try:\n        con.execute(\"ALTER TABLE media ADD COLUMN dub_languages TEXT\")\n    except Exception:\n        pass  # Spalte existiert bereits\n    try:\n        # Dienste gehören zu EINER Config (eigener Streaming-Satz je Config, z.B. H komplett getrennt).\n        con.execute(\"ALTER TABLE services ADD COLUMN config_slug TEXT DEFAULT 'anime'\")\n        con.execute(\"UPDATE services SET config_slug='anime' WHERE config_slug IS NULL AND space='normal'\")\n        con.execute(\"UPDATE services SET config_slug='h' WHERE config_slug IS NULL AND space='h'\")\n    except Exception:\n        pass  # Spalte existiert bereits\n    try:\n        con.execute(\"ALTER TABLE user_entry ADD COLUMN favorite INTEGER DEFAULT 0\")  # ♥ Favorit\n    except Exception:\n        pass\n    try:\n        con.execute(\"ALTER TABLE user_entry ADD COLUMN favorite_order INTEGER\")  # Rang in der Favoriten-Liste\n    except Exception:\n        pass\n    # AniList-Zusatzdaten (Import ueber /sync/anilist/import) — rein additiv\n    for tbl, col, typ in [\n        (\"media\", \"season\", \"TEXT\"), (\"media\", \"country\", \"TEXT\"), (\"media\", \"source\", \"TEXT\"),\n        (\"media\", \"studios\", \"TEXT\"), (\"media\", \"oadb_id\", \"TEXT\"), (\"services\", \"search_schema\", \"TEXT\"), (\"media\", \"kitsu_id\", \"INTEGER\"), (\"media\", \"next_airing_ep\", \"INTEGER\"), (\"media\", \"next_airing_at\", \"INTEGER\"),\n        (\"user_entry\", \"started_at\", \"TEXT\"), (\"user_entry\", \"completed_at\", \"TEXT\"), (\"user_entry\", \"rewatches\", \"INTEGER\"),\n    ]:\n        try:\n            con.execute(f\"ALTER TABLE {tbl} ADD COLUMN {col} {typ}\")\n        except Exception:\n            pass\n    con.commit()\n    con.close()\n\n\ndef _row_to_media(row: sqlite3.Row) -> dict[str, Any]:\n    d = dict(row)\n    for f in JSON_FIELDS:\n        if f in d and d[f]:\n            try:\n                d[f] = json.loads(d[f])\n            except Exception:\n                d[f] = None\n    # bequeme Anzeige-Felder\n    d[\"title\"] = d.get(\"title_de\") or d.get(\"title_english\") or d.get(\"title_romaji\") or d.get(\"title_native\")\n    d[\"description\"] = d.get(\"description_de\") or d.get(\"description_en\")\n    return d\n\n\nclass MediaRepo(ABC):\n    \"\"\"Schmale, implementierungs-unabhaengige Schnittstelle (Remote/lokal).\"\"\"\n\n    @abstractmethod\n    def upsert_media(self, m: dict[str, Any]) -> int: ...\n\n    @abstractmethod\n    def list_media(self, **f: Any) -> list[dict[str, Any]]: ...\n\n    @abstractmethod\n    def get_media(self, media_id: int) -> Optional[dict[str, Any]]: ...\n\n    @abstractmethod\n    def set_user_entry(self, media_id: int, patch: dict[str, Any]) -> dict[str, Any]: ...\n\n    @abstractmethod\n    def count(self, **f: Any) -> int: ...\n\n\n_MEDIA_COLS = [\n    \"space\", \"media_type\", \"anilist_id\", \"mal_id\", \"anisearch_id\",\n    \"title_romaji\", \"title_english\", \"title_native\", \"title_de\", \"synonyms\",\n    \"format\", \"status\", \"episodes\", \"season_year\", \"genres\", \"tags\",\n    \"is_adult\", \"popularity\", \"average_score\", \"cover_url\", \"banner_url\", \"color\",\n    \"description_en\", \"description_de\", \"dub_de\", \"dub_tier\", \"dub_languages\", \"info_links\", \"search_blob\",\n]\n_USER_COLS = [\"rating\", \"note\", \"watch_status\", \"progress\", \"collection\", \"lent_to\", \"lent_since\", \"favorite\", \"favorite_order\",\n              \"started_at\", \"completed_at\", \"rewatches\"]\n\n\nclass SqliteRepo(MediaRepo):\n    def __init__(self) -> None:\n        init_db()\n\n    # ---- schreiben -------------------------------------------------------\n    def upsert_media(self, m: dict[str, Any]) -> int:\n        row = {k: m.get(k) for k in _MEDIA_COLS}\n        for f in JSON_FIELDS:\n            if isinstance(row.get(f), (list, dict)):\n                row[f] = json.dumps(row[f], ensure_ascii=False)\n        # search_blob fuer Findbarkeit ueber alle Titelvarianten + Synonyme\n        titles = [m.get(\"title_romaji\"), m.get(\"title_english\"), m.get(\"title_native\"), m.get(\"title_de\")]\n        syn = m.get(\"synonyms\") or []\n        if isinstance(syn, str):\n            try:\n                syn = json.loads(syn)\n            except Exception:\n                syn = []\n        row[\"search_blob\"] = \" | \".join(t.lower() for t in (titles + list(syn)) if t)\n\n        con = connect()\n        try:\n            key_col = \"anilist_id\" if m.get(\"anilist_id\") else \"mal_id\"\n            cur = con.execute(\n                f\"SELECT id FROM media WHERE space=? AND {key_col}=?\",\n                (row[\"space\"], m.get(key_col)),\n            )\n            existing = cur.fetchone()\n            if existing:\n                mid = existing[\"id\"]\n                # description_de (teure Übersetzung) beim Re-Import NICHT mit None überschreiben\n                parts, vals = [], []\n                for c in _MEDIA_COLS:\n                    parts.append(\"description_de=COALESCE(?, description_de)\" if c == \"description_de\" else f\"{c}=?\")\n                    vals.append(row[c])\n                con.execute(f\"UPDATE media SET {', '.join(parts)}, updated_at=datetime('now') WHERE id=?\", vals + [mid])\n            else:\n                cols = \", \".join(_MEDIA_COLS)\n                ph = \", \".join(\"?\" for _ in _MEDIA_COLS)\n                cur = con.execute(f\"INSERT INTO media ({cols}) VALUES ({ph})\", [row[c] for c in _MEDIA_COLS])\n                mid = cur.lastrowid\n            con.commit()\n            return mid\n        finally:\n            con.close()\n\n    def set_user_entry(self, media_id: int, patch: dict[str, Any]) -> dict[str, Any]:\n        fields = {k: v for k, v in patch.items() if k in _USER_COLS}\n        con = connect()\n        try:\n            con.execute(\"INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)\", (media_id,))\n            if fields:\n                sets = \", \".join(f\"{c}=?\" for c in fields) + \", updated_at=datetime('now')\"\n                con.execute(f\"UPDATE user_entry SET {sets} WHERE media_id=?\", list(fields.values()) + [media_id])\n            con.commit()\n            r = con.execute(\"SELECT * FROM user_entry WHERE media_id=?\", (media_id,)).fetchone()\n            return dict(r) if r else {}\n        finally:\n            con.close()\n\n    def set_favorites_order(self, ids: list[int]) -> None:\n        \"\"\"Rangfolge der Favoriten setzen (Drag-and-drop). Reihenfolge = Platz 1,2,3…\"\"\"\n        con = connect()\n        try:\n            for i, mid in enumerate(ids):\n                con.execute(\"INSERT OR IGNORE INTO user_entry (media_id) VALUES (?)\", (mid,))\n                con.execute(\"UPDATE user_entry SET favorite=1, favorite_order=? WHERE media_id=?\", (i, mid))\n            con.commit()\n        finally:\n            con.close()\n\n    # ---- lesen -----------------------------------------------------------\n    @staticmethod\n    def _as_list(v: Any) -> list[str]:\n        if not v:\n            return []\n        if isinstance(v, str):\n            return [x.strip() for x in v.split(\",\") if x.strip()]\n        return list(v)\n\n    def _where(self, f: dict[str, Any]) -> tuple[str, list[Any]]:\n        clauses, args = [\"m.space=?\"], [f.get(\"space\", \"normal\")]\n        if f.get(\"media_type\"):\n            clauses.append(\"m.media_type=?\"); args.append(f[\"media_type\"])\n        # Genres (mehrere → UND, wie AniList)\n        genres = self._as_list(f.get(\"genres\")) or self._as_list(f.get(\"genre\"))\n        for g in genres:\n            clauses.append(\"lower(m.genres) LIKE ?\"); args.append(f'%\"{g.lower()}\"%')\n        # Tags (mehrere → UND), Saison/Land/Quelle/Studio (AniList-Import)\n        for t in self._as_list(f.get(\"tags\")):\n            clauses.append(\"lower(m.tags) LIKE ?\"); args.append(f'%\"{t.lower()}\"%')\n        for col in (\"season\", \"country\", \"source\"):\n            if f.get(col):\n                clauses.append(f\"m.{col}=?\"); args.append(str(f[col]).upper())\n        if f.get(\"studio\"):\n            clauses.append(\"lower(m.studios) LIKE ?\"); args.append(f'%\"{str(f[\"studio\"]).lower()}\"%')\n        # Format (mehrere → ODER)\n        fmts = self._as_list(f.get(\"format\"))\n        if fmts:\n            clauses.append(\"(\" + \" OR \".join(\"m.format=?\" for _ in fmts) + \")\"); args.extend(fmts)\n        # Freigabe-Status (mehrere → ODER)\n        sts = self._as_list(f.get(\"status\"))\n        if sts:\n            clauses.append(\"(\" + \" OR \".join(\"m.status=?\" for _ in sts) + \")\"); args.extend(sts)\n        if f.get(\"year_min\"):\n            clauses.append(\"m.season_year>=?\"); args.append(int(f[\"year_min\"]))\n        if f.get(\"year_max\"):\n            clauses.append(\"m.season_year<=?\"); args.append(int(f[\"year_max\"]))\n        if f.get(\"dub\") is not None:\n            clauses.append(\"m.dub_de=?\"); args.append(1 if f[\"dub\"] else 0)\n        if f.get(\"dub_lang\"):\n            clauses.append(\"lower(m.dub_languages) LIKE ?\"); args.append(f'%\"{f[\"dub_lang\"].lower()}\"%')\n        if f.get(\"q\"):\n            clauses.append(\"m.search_blob LIKE ?\"); args.append(f'%{f[\"q\"].lower()}%')\n        if f.get(\"collection\"):\n            clauses.append(\"u.collection=?\"); args.append(f[\"collection\"])\n        ws = f.get(\"watch_status\")\n        if ws == \"all\":  # \"Meine Liste / Alle\" = alle Einträge mit irgendeinem Status\n            clauses.append(\"u.watch_status IS NOT NULL AND u.watch_status<>'none'\")\n        elif ws:\n            clauses.append(\"u.watch_status=?\"); args.append(ws)\n        # Gesehen/Nicht-gesehen (wirkt mit + ohne KI). yes = completed/rewatching, no = Rest.\n        seen = f.get(\"seen\")\n        if seen in (\"yes\", True, \"1\", 1):\n            clauses.append(\"u.watch_status IN ('completed','rewatching')\")\n        elif seen in (\"no\", False, \"0\", 0):\n            clauses.append(\"(u.watch_status IS NULL OR u.watch_status NOT IN ('completed','rewatching'))\")\n        if f.get(\"favorite\") in (\"1\", 1, True, \"yes\"):\n            clauses.append(\"u.favorite=1\")\n        if f.get(\"rating\"):  # nach vergebener Punktzahl filtern (exakt 1..10)\n            clauses.append(\"u.rating=?\"); args.append(int(f[\"rating\"]))\n        return \" AND \".join(clauses), args\n\n    def list_media(self, **f: Any) -> list[dict[str, Any]]:\n        where, args = self._where(f)\n        order = {\"popularity\": \"m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id\", \"score\": \"m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id\",\n                 \"title\": \"m.search_blob ASC\", \"recent\": \"m.updated_at DESC\",\n                 \"favorite\": \"u.favorite_order IS NULL, u.favorite_order ASC\"}.get(f.get(\"sort\", \"popularity\"), \"m.average_score IS NULL, m.average_score DESC, m.popularity DESC, m.id\")\n        limit = int(f.get(\"limit\", 60)); offset = int(f.get(\"offset\", 0))\n        sql = (\n            \"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since, u.favorite, u.started_at, u.completed_at, u.rewatches \"\n            \"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id \"\n            f\"WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?\"\n        )\n        con = connect()\n        try:\n            rows = con.execute(sql, args + [limit, offset]).fetchall()\n            return [_row_to_media(r) for r in rows]\n        finally:\n            con.close()\n\n    def count(self, **f: Any) -> int:\n        where, args = self._where(f)\n        con = connect()\n        try:\n            r = con.execute(\n                f\"SELECT COUNT(*) c FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE {where}\",\n                args,\n            ).fetchone()\n            return r[\"c\"]\n        finally:\n            con.close()\n\n    def get_media(self, media_id: int) -> Optional[dict[str, Any]]:\n        con = connect()\n        try:\n            r = con.execute(\n                \"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since, u.favorite, u.started_at, u.completed_at, u.rewatches \"\n                \"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE m.id=?\",\n                (media_id,),\n            ).fetchone()\n            return _row_to_media(r) if r else None\n        finally:\n            con.close()\n\n    # ---- Profil-Statistik (wie AniList-Overview) -------------------------\n    def profile_stats(self) -> dict[str, Any]:\n        from collections import Counter\n\n        con = connect()\n        try:\n            by_status = {\n                r[\"watch_status\"]: r[\"c\"]\n                for r in con.execute(\n                    \"SELECT watch_status, COUNT(*) c FROM user_entry WHERE watch_status<>'none' GROUP BY watch_status\"\n                )\n            }\n            agg = con.execute(\n                \"SELECT COUNT(*) total, COALESCE(SUM(progress),0) eps, AVG(rating) mean \"\n                \"FROM user_entry WHERE watch_status<>'none'\"\n            ).fetchone()\n            rated = con.execute(\n                \"SELECT rating, COUNT(*) c FROM user_entry WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating\"\n            ).fetchall()\n            gc: Counter = Counter()\n            for r in con.execute(\n                \"SELECT m.genres FROM media m JOIN user_entry u ON u.media_id=m.id \"\n                \"WHERE u.watch_status NOT IN ('none','planning')\"\n            ):\n                if r[\"genres\"]:\n                    try:\n                        for g in json.loads(r[\"genres\"]):\n                            gc[g] += 1\n                    except Exception:\n                        pass\n            eps = agg[\"eps\"] or 0\n            # Days Planned: geplante Titel * Folgen * 24 min\n            planned_eps = con.execute(\n                \"SELECT COALESCE(SUM(m.episodes),0) e FROM media m JOIN user_entry u ON u.media_id=m.id \"\n                \"WHERE u.watch_status='planning'\"\n            ).fetchone()[\"e\"] or 0\n            # Standardabweichung der Wertungen\n            ratings = [r[\"rating\"] for r in con.execute(\n                \"SELECT rating FROM user_entry WHERE rating IS NOT NULL\")]\n            std_dev = None\n            if len(ratings) > 1:\n                mu = sum(ratings) / len(ratings)\n                std_dev = round((sum((x - mu) ** 2 for x in ratings) / len(ratings)) ** 0.5, 2)\n            # Stunden je Wertung (progress * 24 min)\n            hours_by_score = {\n                str(r[\"rating\"]): round((r[\"mins\"] or 0) / 60, 1)\n                for r in con.execute(\n                    \"SELECT rating, SUM(COALESCE(progress,0))*24 mins FROM user_entry \"\n                    \"WHERE rating IS NOT NULL GROUP BY rating ORDER BY rating\")\n            }\n            # Folgen-Verteilung der gelisteten Titel (Buckets)\n            buckets = {\"1\": 0, \"2–12\": 0, \"13–26\": 0, \"27–50\": 0, \"51–100\": 0, \"100+\": 0}\n            for r in con.execute(\n                \"SELECT m.episodes e FROM media m JOIN user_entry u ON u.media_id=m.id \"\n                \"WHERE u.watch_status<>'none' AND m.episodes IS NOT NULL\"\n            ):\n                e = r[\"e\"]\n                k = (\"1\" if e <= 1 else \"2–12\" if e <= 12 else \"13–26\" if e <= 26\n                     else \"27–50\" if e <= 50 else \"51–100\" if e <= 100 else \"100+\")\n                buckets[k] += 1\n            return {\n                \"total\": agg[\"total\"] or 0,\n                \"by_status\": by_status,\n                \"episodes\": eps,\n                \"days_watched\": round(eps * 24 / 60 / 24, 1),\n                \"days_planned\": round(planned_eps * 24 / 60 / 24, 1),\n                \"mean_score\": round(agg[\"mean\"], 1) if agg[\"mean\"] else None,\n                \"std_dev\": std_dev,\n                \"score_dist\": {str(r[\"rating\"]): r[\"c\"] for r in rated},\n                \"hours_by_score\": hours_by_score,\n                \"episode_dist\": buckets,\n                \"top_genres\": gc.most_common(12),\n            }\n        finally:\n            con.close()\n\n    # ---- Verteilungen für Stats-Donuts + Jahr-Linie (aus vorhandenen Daten) ----\n    def stats_distributions(self) -> dict[str, Any]:\n        con = connect()\n        try:\n            def grp(col: str) -> list[dict[str, Any]]:\n                rows = con.execute(\n                    f\"SELECT m.{col} k, COUNT(*) c FROM media m JOIN user_entry u ON u.media_id=m.id \"\n                    f\"WHERE u.watch_status<>'none' AND m.{col} IS NOT NULL GROUP BY m.{col} ORDER BY c DESC\"\n                )\n                return [{\"key\": r[\"k\"], \"count\": r[\"c\"]} for r in rows]\n            by_status = [\n                {\"key\": r[\"watch_status\"], \"count\": r[\"c\"]}\n                for r in con.execute(\n                    \"SELECT watch_status, COUNT(*) c FROM user_entry WHERE watch_status<>'none' \"\n                    \"GROUP BY watch_status ORDER BY c DESC\")\n            ]\n            by_year = [\n                {\"key\": r[\"y\"], \"count\": r[\"c\"]}\n                for r in con.execute(\n                    \"SELECT m.season_year y, COUNT(*) c FROM media m JOIN user_entry u ON u.media_id=m.id \"\n                    \"WHERE u.watch_status<>'none' AND m.season_year IS NOT NULL GROUP BY m.season_year ORDER BY m.season_year\")\n            ]\n            return {\"by_format\": grp(\"format\"), \"by_status\": by_status, \"by_year\": by_year}\n        finally:\n            con.close()\n\n    # ---- Stats-Unterseiten: ranked Aggregation über ein JSON-Array-Feld -----\n    def stats_by_field(self, field: str) -> list[dict[str, Any]]:\n        \"\"\"Ranked Liste (Genre/Tag): je Wert Count + Mean-Score + Stunden. field∈genres|tags.\"\"\"\n        if field not in (\"genres\", \"tags\", \"studios\"):\n            raise ValueError(\"field muss genres, tags oder studios sein\")\n        from collections import defaultdict\n\n        con = connect()\n        try:\n            agg: dict[str, dict[str, float]] = defaultdict(lambda: {\"count\": 0, \"score_sum\": 0.0, \"score_n\": 0, \"mins\": 0})\n            for r in con.execute(\n                f\"SELECT m.{field} v, u.rating, COALESCE(u.progress,0) prog FROM media m \"\n                \"JOIN user_entry u ON u.media_id=m.id WHERE u.watch_status<>'none'\"\n            ):\n                if not r[\"v\"]:\n                    continue\n                try:\n                    vals = json.loads(r[\"v\"])\n                except Exception:\n                    continue\n                for name in vals:\n                    a = agg[name]\n                    a[\"count\"] += 1\n                    a[\"mins\"] += r[\"prog\"] * 24\n                    if r[\"rating\"] is not None:\n                        a[\"score_sum\"] += r[\"rating\"]; a[\"score_n\"] += 1\n            out = [\n                {\n                    \"name\": name,\n                    \"count\": int(a[\"count\"]),\n                    \"mean_score\": round(a[\"score_sum\"] / a[\"score_n\"], 1) if a[\"score_n\"] else None,\n                    \"hours\": round(a[\"mins\"] / 60, 1),\n                }\n                for name, a in agg.items()\n            ]\n            out.sort(key=lambda x: x[\"count\"], reverse=True)\n            return out\n        finally:\n            con.close()\n\n    # ---- Medientyp-Configs (Dropdown-Umschalter) -------------------------\n    def list_media_types(self, include_hidden: bool = False) -> list[dict[str, Any]]:\n        con = connect()\n        try:\n            sql = \"SELECT * FROM media_types WHERE enabled=1\"\n            if not include_hidden:\n                sql += \" AND hidden=0\"\n            sql += \" ORDER BY sort_order, name\"\n            return [dict(r) for r in con.execute(sql)]\n        finally:\n            con.close()\n\n    def get_media_type(self, slug: str) -> Optional[dict[str, Any]]:\n        con = connect()\n        try:\n            r = con.execute(\"SELECT * FROM media_types WHERE slug=?\", (slug,)).fetchone()\n            return dict(r) if r else None\n        finally:\n            con.close()\n\n    def add_media_type(self, slug: str, name: str, description: Optional[str],\n                       space: str, media_type: str, hidden: int = 0) -> None:\n        con = connect()\n        try:\n            n = con.execute(\"SELECT COALESCE(MAX(sort_order),0)+1 n FROM media_types\").fetchone()[\"n\"]\n            con.execute(\n                \"INSERT INTO media_types (slug,name,description,space,media_type,hidden,enabled,sort_order,deletable) \"\n                \"VALUES (?,?,?,?,?,?,1,?,1) \"\n                \"ON CONFLICT(slug) DO UPDATE SET name=excluded.name, description=excluded.description, \"\n                \"space=excluded.space, media_type=excluded.media_type, hidden=excluded.hidden, enabled=1\",\n                (slug, name, description, space, media_type, int(hidden), n),\n            )\n            con.commit()\n        finally:\n            con.close()\n\n    def delete_media_type(self, slug: str) -> None:\n        con = connect()\n        try:\n            con.execute(\"DELETE FROM media_types WHERE slug=? AND deletable=1\", (slug,))\n            con.commit()\n        finally:\n            con.close()\n\n    # ---- services (generischer Dienst-Checker, PRO CONFIG) ---------------\n    def list_services(self, config_slug: str = \"anime\") -> list[dict[str, Any]]:\n        con = connect()\n        try:\n            rows = con.execute(\n                \"SELECT * FROM services WHERE enabled=1 AND config_slug=?\", (config_slug,)\n            ).fetchall()\n            return [dict(r) for r in rows]\n        finally:\n            con.close()\n\n    def add_service(self, name: str, url_schema: str, logo: Optional[str] = None,\n                    config_slug: str = \"anime\", space: str = \"normal\", search_schema: Optional[str] = None) -> int:\n        con = connect()\n        try:\n            cur = con.execute(\n                \"INSERT INTO services (name, url_schema, search_schema, logo, space, config_slug, enabled) VALUES (?,?,?,?,?,?,1)\",\n                (name, url_schema, search_schema, logo, space, config_slug),\n            )\n            con.commit()\n            return cur.lastrowid\n        finally:\n            con.close()\n\n    # ---- Filter-Metadaten PRO CONFIG (eigene Genres/Formate je Config) ---\n    def filter_meta(self, space: str = \"normal\", media_type: Optional[str] = None) -> dict[str, Any]:\n        con = connect()\n        try:\n            where = \"space=?\"\n            args: list[Any] = [space]\n            if media_type:\n                where += \" AND media_type=?\"; args.append(media_type)\n            formats = [r[0] for r in con.execute(\n                f\"SELECT DISTINCT format FROM media WHERE {where} AND format IS NOT NULL ORDER BY format\", args)]\n            statuses = [r[0] for r in con.execute(\n                f\"SELECT DISTINCT status FROM media WHERE {where} AND status IS NOT NULL ORDER BY status\", args)]\n            yr = con.execute(\n                f\"SELECT MIN(season_year), MAX(season_year) FROM media WHERE {where} AND season_year IS NOT NULL\", args\n            ).fetchone()\n            # Genres aus den echten Daten DIESER Config sammeln (H hat andere als Anime)\n            gc: dict[str, int] = {}\n            for r in con.execute(f\"SELECT genres FROM media WHERE {where} AND genres IS NOT NULL\", args):\n                if r[\"genres\"]:\n                    try:\n                        for g in json.loads(r[\"genres\"]):\n                            gc[g] = gc.get(g, 0) + 1\n                    except Exception:\n                        pass\n            genres = [g for g, _ in sorted(gc.items(), key=lambda x: (-x[1], x[0]))]\n            tc: dict[str, int] = {}\n            for r in con.execute(f\"SELECT tags FROM media WHERE {where} AND tags IS NOT NULL\", args):\n                try:\n                    for t in json.loads(r[\"tags\"] or \"[]\"):\n                        tc[t] = tc.get(t, 0) + 1\n                except Exception:\n                    pass\n            tags = [t for t, _ in sorted(tc.items(), key=lambda x: (-x[1], x[0]))]\n            return {\"formats\": formats, \"statuses\": statuses, \"year_min\": yr[0], \"year_max\": yr[1], \"genres\": genres, \"tags\": tags}\n        finally:\n            con.close()\n\n    def delete_service(self, sid: int) -> None:\n        con = connect()\n        try:\n            con.execute(\"DELETE FROM services WHERE id=?\", (sid,))\n            con.commit()\n        finally:\n            con.close()\n\n    def meta_get(self, key: str) -> Optional[str]:\n        con = connect()\n        try:\n            r = con.execute(\"SELECT value FROM meta_kv WHERE key=?\", (key,)).fetchone()\n            return r[\"value\"] if r else None\n        finally:\n            con.close()\n\n    def meta_set(self, key: str, value: str) -> None:\n        con = connect()\n        try:\n            con.execute(\"INSERT INTO meta_kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=?\",\n                        (key, value, value))\n            con.commit()\n        finally:\n            con.close()\n\n\nrepo = SqliteRepo()\n";

const __vite_glob_0_7 = "\"\"\"Semantische Suche: Katalog einmal mit bge-m3 embedden (inkrementell), Vektoren in\nsqlite-vec. Suche = Query embedden + KNN + Filter (space, 'neu fuer mich').\"\"\"\nfrom __future__ import annotations\n\nimport re\n\nimport sqlite_vec\n\nfrom .db import connect\nfrom .sources import ollama\n\n\ndef _strip(html: str | None) -> str:\n    if not html:\n        return \"\"\n    return re.sub(r\"<[^>]+>\", \" \", html)\n\n\ndef _dim() -> int:\n    from .db import repo\n    return int(repo.meta_get(\"ai_index_dim\") or ollama.EMBED_DIM)\n\n\ndef ensure_table(con) -> None:\n    con.execute(\n        f\"CREATE VIRTUAL TABLE IF NOT EXISTS vec_media USING vec0(\"\n        f\"media_id INTEGER PRIMARY KEY, embedding FLOAT[{_dim()}])\"\n    )\n\n\ndef rebuild(progress=None) -> dict:\n    \"\"\"Index mit dem AKTUELLEN Modell komplett neu aufbauen (Dimension wird erkannt).\"\"\"\n    from . import aiconf\n    from .db import repo\n    dim = len(aiconf.embed([\"Test\"])[0])\n    con = connect()\n    con.execute(\"DROP TABLE IF EXISTS vec_media\")\n    con.commit()\n    con.close()\n    repo.meta_set(\"ai_index_dim\", str(dim))\n    res = index_all(progress=progress)\n    repo.meta_set(\"ai_index_model\", aiconf.model_id())\n    return res\n\n\ndef _doc(row) -> str:\n    import json\n\n    genres = []\n    if row[\"genres\"]:\n        try:\n            genres = json.loads(row[\"genres\"])\n        except Exception:\n            pass\n    title = row[\"title_english\"] or row[\"title_romaji\"] or row[\"title_native\"] or \"\"\n    return f\"{title}. Genres: {', '.join(genres)}. {_strip(row['description_en'])[:1500]}\".strip()\n\n\ndef index_all(batch: int = 32, progress=None) -> dict:\n    con = connect()\n    ensure_table(con)\n    done = {r[0] for r in con.execute(\"SELECT media_id FROM vec_media\").fetchall()}\n    rows = con.execute(\"SELECT id, title_english, title_romaji, title_native, genres, description_en FROM media\").fetchall()\n    todo = [r for r in rows if r[\"id\"] not in done]\n    total = len(todo)\n    n = 0\n    for i in range(0, total, batch):\n        chunk = todo[i : i + batch]\n        vecs = ollama.embed([_doc(r) for r in chunk])\n        for r, v in zip(chunk, vecs):\n            con.execute(\n                \"INSERT OR REPLACE INTO vec_media(media_id, embedding) VALUES (?, ?)\",\n                (r[\"id\"], sqlite_vec.serialize_float32(v)),\n            )\n        con.commit()\n        n += len(chunk)\n        if progress:\n            progress(n, total)\n        print(f\"  indexiert {n}/{total}\", flush=True)\n    con.close()\n    return {\"indexed\": n, \"already\": len(done), \"total_media\": len(rows)}\n\n\ndef index_count() -> dict:\n    con = connect()\n    ensure_table(con)\n    v = con.execute(\"SELECT COUNT(*) c FROM vec_media\").fetchone()[\"c\"]\n    m = con.execute(\"SELECT COUNT(*) c FROM media\").fetchone()[\"c\"]\n    con.close()\n    return {\"embedded\": v, \"media\": m}\n\n\ndef search(query: str, space: str = \"normal\", limit: int = 3, new_for_me: bool = False,\n           filters: dict | None = None, candidates: int = 300) -> list[dict]:\n    \"\"\"Semantische Suche + GLEICHZEITIG die manuellen Filter (genres/format/status/year/dub/seen/media_type).\n    KNN liefert Kandidaten, danach werden sie durch dieselbe _where-Logik gefiltert.\"\"\"\n    import json\n\n    f = dict(filters or {})\n    f[\"space\"] = space\n    qv = ollama.embed([query])[0]\n    con = connect()\n    ensure_table(con)\n    knn = con.execute(\n        \"SELECT media_id, distance FROM vec_media WHERE embedding MATCH ? ORDER BY distance LIMIT ?\",\n        (sqlite_vec.serialize_float32(qv), candidates),\n    ).fetchall()\n    order = {r[\"media_id\"]: (i, r[\"distance\"]) for i, r in enumerate(knn)}\n    if not order:\n        con.close()\n        return []\n    ids = list(order.keys())\n\n    from .db import SqliteRepo, _row_to_media\n    where, args = SqliteRepo()._where(f)\n    ph = \",\".join(\"?\" for _ in ids)\n    rows = con.execute(\n        f\"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since \"\n        f\"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id \"\n        f\"WHERE m.id IN ({ph}) AND {where}\",\n        ids + args,\n    ).fetchall()\n    con.close()\n\n    out = []\n    for r in rows:\n        if new_for_me and (r[\"watch_status\"] in (\"completed\", \"watching\")):\n            continue\n        d = _row_to_media(r)\n        d[\"_rank\"] = order[r[\"id\"]][0]\n        d[\"_distance\"] = round(order[r[\"id\"]][1], 4)\n        out.append(d)\n    out.sort(key=lambda x: x[\"_rank\"])\n    return out[:limit]\n\n\n# ---- Bausteine fuer das eingebettete Backend (Handy): dort rechnet das Plugin die Aehnlichkeit selbst\n# (kein sqlite-vec) und nutzt nur diese beiden Funktionen fuer Filter und Ergebnisdaten.\ndef allowed_ids(space: str = \"normal\", new_for_me: bool = False, filters: dict | None = None) -> list[int]:\n    \"\"\"IDs aller Titel, die die manuellen Filter erfuellen (gleiche _where-Logik wie die Suche).\"\"\"\n    f = dict(filters or {})\n    f[\"space\"] = space\n    from .db import SqliteRepo\n    where, args = SqliteRepo()._where(f)\n    con = connect()\n    try:\n        rows = con.execute(\n            f\"SELECT m.id, u.watch_status FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE {where}\", args\n        ).fetchall()\n    finally:\n        con.close()\n    return [r[\"id\"] for r in rows if not (new_for_me and r[\"watch_status\"] in (\"completed\", \"watching\"))]\n\n\ndef fetch_ordered(ids: list[int], distances: list[float] | None = None) -> list[dict]:\n    \"\"\"Titel zu den IDs in genau dieser Reihenfolge (mit _rank/_distance wie die Server-Suche).\"\"\"\n    if not ids:\n        return []\n    from .db import _row_to_media\n    con = connect()\n    try:\n        ph = \",\".join(\"?\" for _ in ids)\n        rows = con.execute(\n            f\"SELECT m.*, u.rating, u.note, u.watch_status, u.progress, u.collection, u.lent_to, u.lent_since \"\n            f\"FROM media m LEFT JOIN user_entry u ON u.media_id=m.id WHERE m.id IN ({ph})\", ids\n        ).fetchall()\n    finally:\n        con.close()\n    by = {r[\"id\"]: r for r in rows}\n    out = []\n    for i, mid in enumerate(ids):\n        if mid in by:\n            d = _row_to_media(by[mid])\n            d[\"_rank\"] = i\n            if distances is not None and i < len(distances):\n                d[\"_distance\"] = round(distances[i], 4)\n            out.append(d)\n    return out\n\n\nif __name__ == \"__main__\":\n    print(index_all())\n";

const __vite_glob_0_8 = "\"\"\"AniList-GDPR-Export → eigene DB (user_entry). Dient als BACKUP/Restore.\n\nDie eigene Liste (Bewertungen, Status, Fortschritt) bleibt so erhalten und ist\nwiederherstellbar — auch wenn am AniList-Konto etwas schiefgeht. Fehlende Titel\n(nicht im Katalog) werden per ID nachgeladen, damit nichts Geschautes fehlt.\n\"\"\"\nfrom __future__ import annotations\n\nimport json\n\nimport httpx\n\nfrom .db import connect, repo\nfrom .importer import _apply_dub, build_info_links\nfrom .sources import anilist, mydublist\n\n# AniList-GDPR-Status-Codes (empirisch bestätigt):\nSTATUS_MAP = {0: \"watching\", 1: \"planning\", 2: \"completed\", 3: \"dropped\", 4: \"paused\", 5: \"rewatching\"}\n\n\ndef _entries(path: str) -> list[dict]:\n    d = json.load(open(path, encoding=\"utf-8\"))\n    return [e for e in d.get(\"lists\", []) if e.get(\"series_type\") == 0]\n\n\ndef run(path: str, fetch_missing: bool = True) -> dict:\n    entries = _entries(path)\n    con = connect()\n    idmap = {\n        r[\"anilist_id\"]: r[\"id\"]\n        for r in con.execute(\"SELECT id, anilist_id FROM media WHERE space='normal' AND anilist_id IS NOT NULL\")\n    }\n    con.close()\n\n    missing = [e[\"series_id\"] for e in entries if e[\"series_id\"] not in idmap]\n    added = 0\n    if fetch_missing and missing:\n        print(f\"  {len(missing)} Titel fehlen im Katalog → nachladen …\", flush=True)\n        with httpx.Client(headers={\"User-Agent\": \"anime-liste/0.1\"}) as client:\n            a2ids, mal2ids = mydublist.load_mappings(client)\n            tier_of = mydublist.load_dub_tiers(client)\n            for m in anilist.fetch_by_ids(client, missing):\n                _apply_dub(m, a2ids, tier_of, mal2ids)\n                mid = repo.upsert_media(m)\n                idmap[m[\"anilist_id\"]] = mid\n                added += 1\n        print(f\"  {added} nachgeladen\", flush=True)\n\n    matched = 0\n    still_missing = []\n    for e in entries:\n        mid = idmap.get(e[\"series_id\"])\n        if not mid:\n            still_missing.append(e[\"series_id\"])\n            continue\n        patch = {\"watch_status\": STATUS_MAP.get(e[\"status\"], \"none\"), \"progress\": e.get(\"progress\") or 0}\n        if e.get(\"score\"):\n            patch[\"rating\"] = round(e[\"score\"] / 10)\n        if e.get(\"notes\"):\n            patch[\"note\"] = e[\"notes\"]\n        repo.set_user_entry(mid, patch)\n        matched += 1\n\n    result = {\"entries\": len(entries), \"matched\": matched, \"nachgeladen\": added, \"fehlen_noch\": len(still_missing)}\n    print(f\"Export-Import fertig: {result}\", flush=True)\n    return result\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    run(sys.argv[1])\n";

const __vite_glob_0_9 = "\"\"\"Import-Pipeline: AniList-Metadaten + MyDubList-Dub-Status + Jikan/MAL-H-Daten.\"\"\"\nfrom __future__ import annotations\n\nimport datetime\n\nimport httpx\n\nfrom .db import repo\nfrom .sources import anilist, jikan, mydublist\n\n\ndef build_info_links(anilist_id, mal_id, anisearch_id) -> dict:\n    links = {}\n    if anilist_id:\n        links[\"anilist\"] = f\"https://anilist.co/anime/{anilist_id}\"\n    if mal_id:\n        links[\"mal\"] = f\"https://myanimelist.net/anime/{mal_id}\"\n    if anisearch_id:\n        links[\"anisearch\"] = f\"https://www.anisearch.com/anime/{anisearch_id}\"\n    return links\n\n\ndef _apply_dub(m: dict, a2ids: dict, tier_of: dict, mal2ids: dict) -> None:\n    mal = m.get(\"mal_id\")\n    ani = a2ids.get(m.get(\"anilist_id\"), {}) if m.get(\"anilist_id\") else {}\n    info = mal2ids.get(mal, {}) if mal else {}\n    if not m.get(\"anilist_id\"):\n        m[\"anilist_id\"] = info.get(\"anilist\")\n    anisearch = m.get(\"anisearch_id\") or ani.get(\"anisearch\") or info.get(\"anisearch\")\n    m[\"anisearch_id\"] = anisearch\n    tier = tier_of.get(mal) if mal else None\n    m[\"dub_de\"] = 1 if tier else 0\n    m[\"dub_tier\"] = tier\n    m[\"info_links\"] = build_info_links(m.get(\"anilist_id\"), mal, anisearch)\n\n\ndef run(pages_anilist: int = 500, hentai_pages: int = 40) -> dict:\n    \"\"\"Voll-Import, STREAMEND (speichert pro Seite → überlebt Abbrüche, zeigt Fortschritt).\"\"\"\n    with httpx.Client(headers={\"User-Agent\": \"anime-liste/0.1 (+local, private)\"}) as client:\n        print(\"MyDubList: Mappings + Dub-Tiers laden …\", flush=True)\n        a2ids, mal2ids = mydublist.load_mappings(client)\n        tier_of = mydublist.load_dub_tiers(client)\n        print(f\"  {len(a2ids)} AniList-Mappings, {len(tier_of)} deutsche Dubs\", flush=True)\n\n        print(\"AniList: Voll-Katalog streamend importieren (Jahr-Sharding) …\", flush=True)\n        n = 0\n        for page in anilist.iter_all(client):\n            for m in page:\n                _apply_dub(m, a2ids, tier_of, mal2ids)\n                repo.upsert_media(m)\n            n += len(page)\n            if n % 500 < 50:\n                print(f\"  Anime {n}\", flush=True)\n\n        print(\"H-Datenraum (AniList isAdult; Jikan IPv6-only) streamend …\", flush=True)\n        hn = 0\n        for page in anilist.iter_adult(client, pages=hentai_pages):\n            for m in page:\n                _apply_dub(m, a2ids, tier_of, mal2ids)\n                repo.upsert_media(m)\n            hn += len(page)\n            print(f\"  H {hn}\", flush=True)\n        repo.meta_set(\"h_source\", \"anilist\")\n\n    repo.meta_set(\"last_import\", datetime.datetime.now().isoformat(timespec=\"seconds\"))\n    repo.meta_set(\"dub_attribution\", mydublist.ATTRIBUTION)\n    stats = {\"anime\": repo.count(space=\"normal\"), \"h\": repo.count(space=\"h\")}\n    print(f\"Import fertig: {stats}\", flush=True)\n    return stats\n\n\nif __name__ == \"__main__\":\n    import argparse\n\n    ap = argparse.ArgumentParser()\n    ap.add_argument(\"--pages\", type=int, default=4, help=\"AniList-Seiten à 50\")\n    ap.add_argument(\"--hentai-pages\", type=int, default=2)\n    args = ap.parse_args()\n    run(args.pages, args.hentai_pages)\n";

const __vite_glob_0_10 = "\"\"\"FastAPI-App — Anime-Liste Backend.\n\nH-Datenraum ist per Passwort-Gate geschuetzt (Bedrohungsmodell: Gaeste am PC).\nDefault zeigt keine Spur von H: /anime bedient nur space='normal'.\n\"\"\"\nfrom __future__ import annotations\n\nimport hashlib\nfrom typing import Optional\n\nfrom pathlib import Path\n\nfrom fastapi import FastAPI, Header, HTTPException, Query, Request\nfrom fastapi.responses import JSONResponse\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom fastapi.staticfiles import StaticFiles\nfrom pydantic import BaseModel\n\nimport secrets\n\nfrom . import auth\nfrom . import availability as avail_mod\nfrom . import db\nfrom . import embeddings as emb\nfrom . import sync_anilist\nfrom . import aiconf\nfrom . import anilist_import\nfrom . import translate as tr\nfrom .db import repo\nfrom .sources import ollama\nfrom .tracker import jellyfin as jf\n\napp = FastAPI(title=\"Orbitlist API\", version=\"0.1.0\")\napp.add_middleware(\n    CORSMiddleware, allow_origins=[\"*\"], allow_methods=[\"*\"], allow_headers=[\"*\"]\n)\n\n\n\n@app.middleware(\"http\")\nasync def _access_guard(request: Request, call_next):\n    h = request.headers.get(\"authorization\", \"\")\n    key = request.headers.get(\"x-orbitlist-key\") or (h[7:] if h.lower().startswith(\"bearer \") else None)\n    client = request.client.host if request.client else \"\"\n    denied = auth.check(request.url.path, client, key, request.method)\n    if denied:\n        return JSONResponse({\"detail\": denied[1]}, status_code=denied[0])\n    return await call_next(request)\n\n\nclass _LoginBody(BaseModel):\n    password: str\n\n\n@app.get(\"/auth/status\")\ndef auth_status() -> dict:\n    return {\"required\": auth.is_required()}\n\n\n@app.post(\"/auth/login\")\ndef auth_login(body: _LoginBody, request: Request) -> dict:\n    if not auth.is_required():\n        return {\"key\": \"\", \"required\": False}\n    try:\n        key = auth.login(body.password, request.client.host if request.client else \"\")\n    except PermissionError as e:\n        raise HTTPException(429, str(e))\n    if not key:\n        raise HTTPException(401, \"Passwort falsch\")\n    return {\"key\": key, \"required\": True}\n\n\n# Legale Standard-Dienste (generischer Checker; Jonas ergaenzt eigene/H-Dienste selbst)\nDEFAULT_SERVICES = [\n    (\"Crunchyroll\", \"https://www.crunchyroll.com/de/search?q={q}\", \"crunchyroll.png\"),\n    (\"Netflix\", \"https://www.netflix.com/search?q={q}\", \"netflix.png\"),\n    (\"Prime Video\", \"https://www.primevideo.com/search?phrase={q}\", \"prime.png\"),\n    (\"Disney+\", \"https://www.disneyplus.com/de-de/search?q={q}\", \"disneyplus.png\"),\n]\n\n\ndef _seed_services() -> None:\n    if repo.list_services(\"anime\"):\n        return\n    con = db.connect()\n    try:\n        for name, schema, logo in DEFAULT_SERVICES:\n            con.execute(\n                \"INSERT INTO services (name, url_schema, logo, space, config_slug, enabled) VALUES (?,?,?, 'normal', 'anime', 1)\",\n                (name, schema, logo),\n            )\n        con.commit()\n    finally:\n        con.close()\n\n\n# Medientyp-Start-Configs (idempotent). Anime = nicht löschbarer Default; H-Configs hidden.\n# (slug, name, description, space, media_type, hidden, deletable, sort_order)\nDEFAULT_MEDIA_TYPES = [\n    (\"anime\", \"Anime\", \"Serien & Filme aus Japan\", \"normal\", \"anime\", 0, 0, 0),\n    (\"manga\", \"Manga\", \"Comics & Light Novels\", \"normal\", \"manga\", 0, 1, 1),\n    (\"book\", \"Bücher\", \"Romane & Sachbücher\", \"normal\", \"book\", 0, 1, 2),\n    (\"film\", \"Filme\", \"Kino & Streaming\", \"normal\", \"film\", 0, 1, 3),\n    (\"series\", \"Serien\", \"Real-Serien & Shows\", \"normal\", \"series\", 0, 1, 4),\n    (\"audiobook\", \"Hörbücher\", \"Audio & Podcasts\", \"normal\", \"audiobook\", 0, 1, 5),\n    (\"h\", \"Hentai\", \"Versteckt — nur nach Entsperren\", \"h\", \"anime\", 1, 1, 10),\n    (\"porno\", \"Porno\", \"Versteckt\", \"h\", \"porno\", 1, 1, 11),\n    (\"doujin\", \"Doujinshi\", \"Versteckt\", \"h\", \"doujin\", 1, 1, 12),\n]\n\n\ndef _seed_media_types() -> None:\n    con = db.connect()\n    try:\n        for slug, name, desc, space, mt, hidden, deletable, order in DEFAULT_MEDIA_TYPES:\n            con.execute(\n                \"INSERT OR IGNORE INTO media_types \"\n                \"(slug,name,description,space,media_type,hidden,enabled,sort_order,deletable) \"\n                \"VALUES (?,?,?,?,?,?,1,?,?)\",\n                (slug, name, desc, space, mt, hidden, order, deletable),\n            )\n        con.commit()\n    finally:\n        con.close()\n\n\n@app.on_event(\"startup\")\ndef _startup() -> None:\n    db.init_db()\n    auth.apply_env()\n    _seed_services()\n    _seed_media_types()\n\n\n# --------------------------------------------------------------------- Katalog-Abzug\n@app.get(\"/catalog/slim.db.gz\")\ndef catalog_slim():\n    \"\"\"Katalog ohne Nutzerdaten fuer das eingebettete Backend (Handy). Oeffentlich lesbar.\"\"\"\n    from fastapi.responses import FileResponse\n    from . import slim\n    return FileResponse(slim.build(), media_type=\"application/gzip\", filename=\"catalog.db.gz\")\n\n\n# --------------------------------------------------------------------- health\n@app.get(\"/health\")\ndef health() -> dict:\n    return {\n        \"status\": \"ok\",\n        \"media_normal\": repo.count(space=\"normal\"),\n        \"media_h\": repo.count(space=\"h\"),\n        \"last_import\": repo.meta_get(\"last_import\"),\n    }\n\n\n@app.get(\"/stats\")\ndef stats() -> dict:\n    return {\n        \"anime\": repo.count(space=\"normal\"),\n        \"anime_dubbed\": repo.count(space=\"normal\", dub=True),\n        \"h\": repo.count(space=\"h\"),\n        \"attribution\": repo.meta_get(\"dub_attribution\"),\n    }\n\n\n# ----------------------------------------------------------------- normale DB\n@app.get(\"/anime\")\ndef list_anime(\n    genre: Optional[str] = None,\n    genres: Optional[str] = None,\n    format: Optional[str] = None,\n    status: Optional[str] = None,\n    year_min: Optional[int] = None,\n    year_max: Optional[int] = None,\n    dub: Optional[bool] = None,\n    dub_lang: Optional[str] = None,\n    q: Optional[str] = None,\n    sort: str = \"popularity\",\n    collection: Optional[str] = None,\n    watch_status: Optional[str] = None,\n    media_type: Optional[str] = None,\n    seen: Optional[str] = None,\n    favorite: Optional[str] = None,\n    rating: Optional[int] = None,\n    tags: Optional[str] = None,\n    season: Optional[str] = None,\n    country: Optional[str] = None,\n    source: Optional[str] = None,\n    studio: Optional[str] = None,\n    limit: int = Query(60, le=2000),\n    offset: int = 0,\n) -> dict:\n    f = dict(space=\"normal\", genre=genre, genres=genres, format=format, status=status,\n             year_min=year_min, year_max=year_max, dub=dub, dub_lang=dub_lang, q=q,\n             collection=collection, watch_status=watch_status, media_type=media_type, seen=seen,\n             favorite=favorite, rating=rating, tags=tags, season=season, country=country, source=source, studio=studio)\n    items = repo.list_media(**f, sort=sort, limit=limit, offset=offset)\n    return {\"total\": repo.count(**f), \"count\": len(items), \"items\": items}\n\n\n@app.get(\"/profile/stats\")\ndef profile_stats() -> dict:\n    return repo.profile_stats()\n\n\n@app.get(\"/stats/distributions\")\ndef stats_distributions() -> dict:\n    return repo.stats_distributions()\n\n\n@app.get(\"/stats/genres\")\ndef stats_genres() -> dict:\n    return {\"items\": repo.stats_by_field(\"genres\")}\n\n\n@app.get(\"/stats/tags\")\ndef stats_tags() -> dict:\n    return {\"items\": repo.stats_by_field(\"tags\")}\n\n\n@app.get(\"/stats/studios\")\ndef stats_studios() -> dict:\n    return {\"items\": repo.stats_by_field(\"studios\")}\n\n\n@app.get(\"/meta/filters\")\ndef meta_filters(\n    space: str = \"normal\",\n    media_type: Optional[str] = None,\n    x_h_password: Optional[str] = Header(None),\n) -> dict:\n    \"\"\"Verfügbare Filterwerte PRO CONFIG (eigene Genres/Formate je Config; H hat andere als Anime).\"\"\"\n    if space == \"h\" and not _h_ok(x_h_password):\n        raise HTTPException(403, \"gesperrt\")\n    return repo.filter_meta(space=space, media_type=media_type)\n\n\n@app.get(\"/anime/{media_id}\")\ndef get_anime(media_id: int) -> dict:\n    m = repo.get_media(media_id)\n    if not m or m[\"space\"] != \"normal\":\n        raise HTTPException(404, \"nicht gefunden\")\n    return m\n\n\n@app.get(\"/services\")\ndef services(config: str = \"anime\") -> list:\n    # Dienste PRO Config (H hat komplett eigene, getrennt von Anime).\n    return repo.list_services(config)\n\n\nclass ServiceBody(BaseModel):\n    name: str\n    url_schema: str\n    search_schema: Optional[str] = None  # Suche des Dienstes (Rueckfall, wenn url_schema ein Direktlink mit {slug} ist)\n    logo: Optional[str] = None\n    config: str = \"anime\"\n    space: str = \"normal\"\n\n\n@app.post(\"/services\")\ndef add_service(body: ServiceBody) -> dict:\n    return {\"id\": repo.add_service(body.name, body.url_schema, body.logo, body.config, body.space, body.search_schema)}\n\n\n@app.delete(\"/services/{sid}\")\ndef del_service(sid: int) -> dict:\n    repo.delete_service(sid)\n    return {\"ok\": True}\n\n\n# ---------------------------------------- Medientyp-Configs (Dropdown-Umschalter)\nclass MediaTypeBody(BaseModel):\n    slug: str\n    name: str\n    description: Optional[str] = None\n    space: str = \"normal\"\n    media_type: str = \"anime\"\n    hidden: bool = False\n\n\nclass ActiveBody(BaseModel):\n    slug: str\n\n\n@app.get(\"/media-types\")\ndef media_types(x_h_password: Optional[str] = Header(None)) -> list:\n    # Versteckte Configs (H) NUR mit gültigem Passwort — sonst verrät die Liste die Existenz von H.\n    return repo.list_media_types(include_hidden=_h_ok(x_h_password))\n\n\n@app.post(\"/media-types\")\ndef add_media_type(body: MediaTypeBody) -> dict:\n    repo.add_media_type(body.slug, body.name, body.description, body.space, body.media_type, int(body.hidden))\n    return {\"ok\": True, \"slug\": body.slug}\n\n\n@app.delete(\"/media-types/{slug}\")\ndef del_media_type(slug: str) -> dict:\n    mt = repo.get_media_type(slug)\n    if not mt:\n        raise HTTPException(404, \"nicht gefunden\")\n    if not mt[\"deletable\"]:\n        raise HTTPException(409, \"Standard-Typ nicht löschbar\")\n    repo.delete_media_type(slug)\n    if repo.meta_get(\"active_media_type\") == slug:\n        repo.meta_set(\"active_media_type\", \"anime\")  # aktiven gelöschten Typ → Fallback Anime\n    return {\"ok\": True}\n\n\n@app.get(\"/media-types/active\")\ndef get_active_media_type() -> dict:\n    # Nur SICHTBARE Typen werden persistiert → H taucht nach Reload NIE von selbst auf (Leak-Schutz).\n    slug = repo.meta_get(\"active_media_type\") or \"anime\"\n    mt = repo.get_media_type(slug)\n    if not mt or mt[\"hidden\"]:\n        mt = repo.get_media_type(\"anime\")\n    return mt or {\"slug\": \"anime\", \"name\": \"Anime\", \"space\": \"normal\", \"media_type\": \"anime\", \"hidden\": 0, \"deletable\": 0}\n\n\n@app.put(\"/media-types/active\")\ndef set_active_media_type(body: ActiveBody) -> dict:\n    mt = repo.get_media_type(body.slug)\n    if not mt:\n        raise HTTPException(404, \"nicht gefunden\")\n    if mt[\"hidden\"]:\n        # Versteckte Typen NICHT persistieren (nur Session) — sonst Leak bei Reload.\n        return {\"ok\": True, \"persisted\": False}\n    repo.meta_set(\"active_media_type\", body.slug)\n    return {\"ok\": True, \"persisted\": True}\n\n\n# ----------------------------------------------------- user entry (Bewerten, Regal)\nclass EntryPatch(BaseModel):\n    rating: Optional[int] = None\n    note: Optional[str] = None\n    watch_status: Optional[str] = None\n    progress: Optional[int] = None\n    collection: Optional[str] = None  # none|wish|owned\n    lent_to: Optional[str] = None\n    lent_since: Optional[str] = None\n    favorite: Optional[int] = None  # 0/1 ♥\n\n\n@app.patch(\"/media/{media_id}/entry\")\ndef patch_entry(media_id: int, patch: EntryPatch) -> dict:\n    if not repo.get_media(media_id):\n        raise HTTPException(404, \"nicht gefunden\")\n    return repo.set_user_entry(media_id, patch.model_dump(exclude_none=True))\n\n\nclass FavOrder(BaseModel):\n    ids: list[int]\n\n\n@app.post(\"/favorites/reorder\")\ndef favorites_reorder(body: FavOrder) -> dict:\n    repo.set_favorites_order(body.ids)\n    return {\"ok\": True, \"count\": len(body.ids)}\n\n\n# ----------------------------------------------------------- H-Gate (versteckt)\ndef _hash(pw: str) -> str:\n    return hashlib.sha256(pw.encode()).hexdigest()\n\n\ndef _h_ok(x_h_password: Optional[str]) -> bool:\n    stored = repo.meta_get(\"h_password_hash\")\n    return bool(stored and x_h_password and _hash(x_h_password) == stored)\n\n\nclass PwBody(BaseModel):\n    password: str\n\n\n@app.get(\"/h/status\")\ndef h_status() -> dict:\n    return {\"configured\": repo.meta_get(\"h_password_hash\") is not None}\n\n\n@app.post(\"/h/password\")\ndef h_set_password(body: PwBody) -> dict:\n    repo.meta_set(\"h_password_hash\", _hash(body.password))\n    return {\"ok\": True}\n\n\n@app.post(\"/h/unlock\")\ndef h_unlock(body: PwBody) -> dict:\n    if not _h_ok(body.password):\n        raise HTTPException(403, \"falsch oder nicht gesetzt\")\n    return {\"ok\": True}\n\n\n@app.post(\"/h/reset\")\ndef h_reset() -> dict:\n    # Casual-Gäste-Modell: Zurücksetzen ohne altes Passwort erlaubt (Gäste gehen nicht in die Einstellungen).\n    con = db.connect()\n    con.execute(\"DELETE FROM meta_kv WHERE key='h_password_hash'\")\n    con.commit()\n    con.close()\n    return {\"ok\": True}\n\n\n@app.get(\"/h\")\ndef list_h(\n    genre: Optional[str] = None,\n    genres: Optional[str] = None,\n    format: Optional[str] = None,\n    status: Optional[str] = None,\n    year_min: Optional[int] = None,\n    year_max: Optional[int] = None,\n    q: Optional[str] = None,\n    media_type: Optional[str] = None,\n    watch_status: Optional[str] = None,\n    seen: Optional[str] = None,\n    favorite: Optional[str] = None,\n    rating: Optional[int] = None,\n    dub: Optional[bool] = None,\n    dub_lang: Optional[str] = None,\n    sort: str = \"popularity\",\n    limit: int = Query(60, le=2000),\n    offset: int = 0,\n    x_h_password: Optional[str] = Header(None),\n) -> dict:\n    if not _h_ok(x_h_password):\n        raise HTTPException(403, \"gesperrt\")\n    f = dict(space=\"h\", genre=genre, genres=genres, format=format, status=status,\n             year_min=year_min, year_max=year_max, q=q, media_type=media_type,\n             watch_status=watch_status, seen=seen, favorite=favorite, rating=rating,\n             dub=dub, dub_lang=dub_lang)\n    items = repo.list_media(**f, sort=sort, limit=limit, offset=offset)\n    return {\"total\": repo.count(**f), \"count\": len(items), \"items\": items}\n\n\n# ------------------------------------------------- KI: Embeddings + semantische Suche\n_idx: dict = {\"running\": False, \"done\": 0, \"total\": 0, \"error\": None}\n\n\n@app.get(\"/ai/status\")\ndef ai_status() -> dict:\n    return {\n        \"embed_model\": ollama.EMBED_MODEL,\n        \"embed_ready\": ollama.has_model(ollama.EMBED_MODEL),\n        \"translate_model\": ollama.TRANSLATE_MODEL,\n        \"translate_ready\": ollama.has_model(ollama.TRANSLATE_MODEL),\n        \"problem\": aiconf.check_ready(),\n        \"indexing\": dict(_idx),\n        **emb.index_count(),\n    }\n\n\n@app.get(\"/ai/config\")\ndef ai_config_get() -> dict:\n    return aiconf.get()\n\n\nclass AiConfig(BaseModel):\n    enabled: Optional[bool] = None\n    mode: Optional[str] = None\n    ext_kind: Optional[str] = None\n    ext_url: Optional[str] = None\n    ext_model: Optional[str] = None\n    ext_key: Optional[str] = None\n\n\n@app.put(\"/ai/config\")\ndef ai_config_put(body: AiConfig) -> dict:\n    try:\n        return aiconf.update(body.model_dump(exclude_none=True))\n    except ValueError as ex:\n        raise HTTPException(400, str(ex))\n\n\n@app.post(\"/ai/test\")\ndef ai_test() -> dict:\n    return aiconf.test()\n\n\ndef _run_index(full: bool) -> None:\n    def prog(n: int, t: int) -> None:\n        _idx[\"done\"], _idx[\"total\"] = n, t\n    try:\n        if full:\n            emb.rebuild(progress=prog)\n        else:\n            emb.index_all(progress=prog)  # nur neue Titel nachziehen\n    except Exception as ex:\n        _idx[\"error\"] = str(ex)[:300]\n    finally:\n        _idx[\"running\"] = False\n\n\n@app.post(\"/ai/index\")\ndef ai_index(rebuild: bool = False) -> dict:\n    \"\"\"Index im Hintergrund pflegen (Fortschritt in /ai/status). rebuild=true: komplett neu mit dem gewählten Modell;\n    sonst nur neue Titel — außer der Index gehört zu einem anderen Modell, dann zwingend komplett neu.\"\"\"\n    import threading\n\n    if _idx[\"running\"]:\n        return {\"started\": False, \"running\": True}\n    t = aiconf.test()\n    if not t[\"ok\"]:\n        raise HTTPException(503, f\"Modell nicht erreichbar: {t['error']}\")\n    _idx.update(running=True, done=0, total=0, error=None)\n    full = rebuild or aiconf.get()[\"index_model\"] != aiconf.model_id()\n    threading.Thread(target=_run_index, args=(full,), daemon=True).start()\n    return {\"started\": True}\n\n\n@app.get(\"/ai/search\")\ndef ai_search(\n    q: str,\n    space: str = \"normal\",\n    new_for_me: bool = False,\n    genre: Optional[str] = None,\n    genres: Optional[str] = None,\n    format: Optional[str] = None,\n    status: Optional[str] = None,\n    year_min: Optional[int] = None,\n    year_max: Optional[int] = None,\n    dub: Optional[bool] = None,\n    dub_lang: Optional[str] = None,\n    media_type: Optional[str] = None,\n    watch_status: Optional[str] = None,\n    seen: Optional[str] = None,\n    favorite: Optional[str] = None,\n    rating: Optional[int] = None,\n    tags: Optional[str] = None,\n    season: Optional[str] = None,\n    country: Optional[str] = None,\n    source: Optional[str] = None,\n    studio: Optional[str] = None,\n    limit: int = Query(20, le=50),\n    x_h_password: Optional[str] = Header(None),\n) -> dict:\n    if space == \"h\" and not _h_ok(x_h_password):\n        raise HTTPException(403, \"gesperrt\")\n    problem = aiconf.check_ready()\n    if problem:\n        raise HTTPException(503, problem)\n    # Semantische Suche GLEICHZEITIG mit den manuellen Filtern (genres/format/status/year/dub/seen/…)\n    filters = dict(genre=genre, genres=genres, format=format, status=status,\n                   year_min=year_min, year_max=year_max, dub=dub, dub_lang=dub_lang,\n                   media_type=media_type, watch_status=watch_status, seen=seen,\n                   favorite=favorite, rating=rating, tags=tags, season=season, country=country,\n                   source=source, studio=studio)\n    return {\"query\": q, \"new_for_me\": new_for_me,\n            \"results\": emb.search(q, space=space, limit=limit, new_for_me=new_for_me, filters=filters)}\n\n\n# ------------------------------------------------------------- Verfuegbarkeit\nclass StreamingBody(BaseModel):\n    items: list[dict]\n\n\n@app.get(\"/media/{media_id}/streaming\")\ndef media_streaming(media_id: int) -> dict:\n    from . import streaming\n    return {\"items\": streaming.get_map([media_id]).get(media_id, [])}\n\n\n@app.put(\"/media/{media_id}/streaming\")\ndef media_streaming_set(media_id: int, body: StreamingBody) -> dict:\n    from . import streaming\n    return {\"saved\": streaming.set_items(media_id, body.items)}\n\n\nclass ScoresBody(BaseModel):\n    items: list[dict]  # [{anilist_id, score}]  (Wertung 0-100, vom Geraet bei AniList abgerufen)\n\n\n@app.put(\"/scores\")\ndef put_scores(body: ScoresBody) -> dict:\n    \"\"\"Vom Geraet geladene Wertungen im Katalog zwischenspeichern (Sortierung nach Wertung).\"\"\"\n    con = db.connect()\n    try:\n        n = 0\n        for it in body.items[:500]:\n            aid, sc = it.get(\"anilist_id\"), it.get(\"score\")\n            if isinstance(aid, int) and isinstance(sc, (int, float)) and 0 < sc <= 100:\n                n += con.execute(\"UPDATE media SET average_score=? WHERE anilist_id=?\", (int(sc), aid)).rowcount\n        con.commit()\n        return {\"saved\": n}\n    finally:\n        con.close()\n\n\n@app.get(\"/streaming\")\ndef streaming_map(ids: str = Query(\"\")) -> dict:\n    \"\"\"Treffer fuer mehrere Titel auf einmal (Wunschliste/Listen): ?ids=1,2,3\"\"\"\n    from . import streaming\n    want = [int(x) for x in ids.split(\",\") if x.strip().isdigit()][:500]\n    return {str(k): v for k, v in streaming.get_map(want).items()}\n\n\n@app.get(\"/media/{media_id}/availability\")\ndef media_availability(media_id: int) -> dict:\n    m = repo.get_media(media_id)\n    if not m:\n        raise HTTPException(404, \"nicht gefunden\")\n    return avail_mod.availability(m)\n\n\n# ------------------------------------------------------------- Uebersetzung\n@app.post(\"/translate/run\")\ndef translate_run(limit: int = 50, space: Optional[str] = None) -> dict:\n    if not ollama.has_model(ollama.TRANSLATE_MODEL):\n        raise HTTPException(503, \"Uebersetzungsmodell nicht geladen\")\n    return tr.translate_missing(limit, space)\n\n\n# ----------------------------------------------- Export (Standard MAL-XML + JSON-Vollbackup)\nfrom fastapi.responses import Response  # noqa: E402\nimport json as _json  # noqa: E402\n\n_MAL_STATUS = {\n    \"watching\": \"Watching\", \"rewatching\": \"Watching\", \"completed\": \"Completed\",\n    \"paused\": \"On-Hold\", \"dropped\": \"Dropped\", \"planning\": \"Plan to Watch\",\n}\n\n\ndef _export_rows() -> list:\n    con = db.connect()\n    try:\n        return con.execute(\n            \"SELECT m.anilist_id, m.mal_id, m.title_romaji, m.title_english, m.title_de, \"\n            \"u.rating, u.watch_status, u.progress, u.note, u.collection, u.favorite, u.favorite_order \"\n            \"FROM media m JOIN user_entry u ON u.media_id=m.id \"\n            \"WHERE m.space='normal' AND (u.watch_status<>'none' OR u.rating IS NOT NULL OR u.favorite=1)\"\n        ).fetchall()\n    finally:\n        con.close()\n\n\n@app.get(\"/export/mal\")\ndef export_mal() -> Response:\n    \"\"\"MAL-kompatibles XML — von AniList/Kitsu/Simkl/MAL importierbar (De-facto-Standard).\"\"\"\n    parts = ['<?xml version=\"1.0\" encoding=\"UTF-8\"?>', \"<myanimelist>\",\n             \"  <myinfo><user_export_type>1</user_export_type></myinfo>\"]\n    for r in _export_rows():\n        if not r[\"mal_id\"] or (r[\"watch_status\"] in (None, \"none\")):\n            continue\n        title = r[\"title_romaji\"] or r[\"title_english\"] or \"\"\n        parts.append(\"  <anime>\")\n        parts.append(f\"    <series_animedb_id>{r['mal_id']}</series_animedb_id>\")\n        parts.append(f\"    <series_title><![CDATA[{title}]]></series_title>\")\n        parts.append(f\"    <my_watched_episodes>{r['progress'] or 0}</my_watched_episodes>\")\n        parts.append(f\"    <my_score>{r['rating'] or 0}</my_score>\")\n        parts.append(f\"    <my_status>{_MAL_STATUS.get(r['watch_status'], 'Watching')}</my_status>\")\n        parts.append(\"    <update_on_import>1</update_on_import>\")\n        parts.append(\"  </anime>\")\n    parts.append(\"</myanimelist>\")\n    xml = \"\\n\".join(parts)\n    return Response(content=xml, media_type=\"application/xml\",\n                    headers={\"Content-Disposition\": \"attachment; filename=orbitlist-mal.xml\"})\n\n\n@app.get(\"/export/json\")\ndef export_json() -> Response:\n    \"\"\"Vollbackup inkl. Orbitlist-Felder (Notiz/Regal/Favorit) — die MAL-XML nicht abbildet.\"\"\"\n    from . import userdata\n    data = userdata.export_dict()\n    body = _json.dumps(data, ensure_ascii=False, indent=2)\n    return Response(content=body, media_type=\"application/json\",\n                    headers={\"Content-Disposition\": \"attachment; filename=orbitlist-backup.json\"})\n\n\n@app.post(\"/import\")\nasync def import_user(request: Request) -> dict:\n    \"\"\"Nutzerdaten importieren: Orbitlist-JSON-Backup oder MAL-XML (Rohtext im Body).\"\"\"\n    from . import userdata\n    try:\n        return userdata.import_text((await request.body()).decode(\"utf-8\"))\n    except Exception as e:\n        raise HTTPException(400, f\"Import fehlgeschlagen: {e}\")\n\n\n# ----------------------------------------------- Sammlung als Einkaufsliste (API-Facette)\n@app.get(\"/collection/export\")\ndef collection_export(status: str = \"wish\") -> dict:\n    items = repo.list_media(space=\"normal\", collection=status, limit=500)\n    svcs = repo.list_services(\"anime\")\n\n    def links(m: dict) -> dict:\n        q = m.get(\"title_romaji\") or m.get(\"title\") or \"\"\n        return {s[\"name\"]: s[\"url_schema\"].replace(\"{q}\", q) for s in svcs}\n\n    return {\n        \"status\": status,\n        \"count\": len(items),\n        \"items\": [\n            {\n                \"title\": m[\"title\"],\n                \"year\": m.get(\"season_year\"),\n                \"rating\": m.get(\"rating\"),\n                \"dubbed_de\": bool(m.get(\"dub_de\")),\n                \"info_links\": m.get(\"info_links\"),\n                \"service_links\": links(m),\n            }\n            for m in items\n        ],\n    }\n\n\n# =================================================================== D/E (Gerüst + Stubs)\n# --- Watch-Tracker: Ingest vom Browser (WebExtension) ---\nclass WatchEvent(BaseModel):\n    source: str  # 'crunchyroll' | 'aniworld' | …\n    serie: str\n    staffel: Optional[int] = None\n    folge: Optional[int] = None\n    position_sec: Optional[float] = None\n    playing: bool = True\n\n\n@app.post(\"/watch\")\ndef watch(ev: WatchEvent) -> dict:\n    con = db.connect()\n    try:\n        row = con.execute(\n            \"SELECT id FROM media WHERE search_blob LIKE ? ORDER BY popularity DESC LIMIT 1\",\n            (f\"%{ev.serie.lower()}%\",),\n        ).fetchone()\n    finally:\n        con.close()\n    if row and ev.folge:\n        repo.set_user_entry(row[\"id\"], {\"watch_status\": \"watching\", \"progress\": ev.folge})\n        return {\"matched\": True, \"media_id\": row[\"id\"]}\n    repo.meta_set(\"last_watch_unmatched\", f\"{ev.source}: {ev.serie} S{ev.staffel}E{ev.folge}\")\n    return {\"matched\": False, \"note\": \"kein DB-Treffer (nachpflegbar)\"}\n\n\n# --- AniList-Export (Stub ohne Token) ---\n@app.get(\"/sync/anilist/preview\")\ndef sync_preview() -> dict:\n    p = sync_anilist.preview()\n    return {\"count\": len(p), \"entries\": p[:50]}\n\n\nclass AniImport(BaseModel):\n    username: str\n\n\n@app.post(\"/sync/anilist/import\")\ndef anilist_import_run(body: AniImport) -> dict:\n    \"\"\"Zusatzdaten aus oeffentlichem AniList-Profil (tokenfrei). Ueberschreibt nie Status/Wertung.\"\"\"\n    try:\n        return anilist_import.run(body.username.strip())\n    except Exception as ex:\n        raise HTTPException(502, f\"AniList-Import fehlgeschlagen: {ex}\")\n\n\n@app.get(\"/sync/anilist/username\")\ndef anilist_username() -> dict:\n    return {\"username\": repo.meta_get(\"anilist_username\")}\n\n\n@app.post(\"/sync/anilist/run\")\ndef sync_run() -> dict:\n    return sync_anilist.run()\n\n\n# --- Jellyfin-Tracker (Stub ohne Env) ---\n@app.get(\"/tracker/jellyfin/now\")\ndef jellyfin_now() -> dict:\n    return jf.now_playing()\n\n\n# --- Pairing: Backend erzeugt URL + Token fuer das Plugin ---\n@app.get(\"/pair/info\")\ndef pair_info() -> dict:\n    tok = repo.meta_get(\"pair_token\")\n    if not tok:\n        tok = secrets.token_urlsafe(18)\n        repo.meta_set(\"pair_token\", tok)\n    return {\"api_base\": \"http://<nexus-ip>:8787\", \"token\": tok, \"note\": \"Im Plugin eintragen (gleiches Netz / WireGuard).\"}\n\n\n# --- gebautes Frontend unter /app servieren (zum direkten Testen im Browser) ---\nimport os as _os\n_PLUGIN_DIST = Path(_os.environ.get(\"ORBITLIST_UI\") or Path(__file__).resolve().parent.parent.parent / \"plugin\" / \"dist\")\nif _PLUGIN_DIST.exists():\n    app.mount(\"/app\", StaticFiles(directory=str(_PLUGIN_DIST), html=True), name=\"app\")\n";

const __vite_glob_0_11 = "\"\"\"Füllt media.dub_languages aus MyDubLists Sprach-Dateien (für den Mehrsprachen-Filter).\nSchnell: lädt nur die Dub-Listen (keine AniList-Calls), updatet per mal_id.\"\"\"\nfrom __future__ import annotations\n\nimport json\n\nimport httpx\n\nfrom .db import connect\nfrom .sources import mydublist\n\n\ndef run() -> dict:\n    with httpx.Client(headers={\"User-Agent\": \"orbitlist/0.1 (+local)\"}) as client:\n        mal_to_langs = mydublist.load_all_dub_languages(client)\n    con = connect()\n    try:\n        rows = con.execute(\"SELECT id, mal_id FROM media WHERE mal_id IS NOT NULL\").fetchall()\n        n = 0\n        for r in rows:\n            langs = mal_to_langs.get(r[\"mal_id\"])\n            if langs:\n                con.execute(\"UPDATE media SET dub_languages=? WHERE id=?\", (json.dumps(langs), r[\"id\"]))\n                n += 1\n        con.commit()\n    finally:\n        con.close()\n    langs_seen = sorted({l for v in mal_to_langs.values() for l in v})\n    print(f\"populate_langs fertig: {n} Titel, Sprachen: {langs_seen}\", flush=True)\n    return {\"updated\": n, \"languages\": langs_seen}\n\n\nif __name__ == \"__main__\":\n    run()\n";

const __vite_glob_0_12 = "\"\"\"Schlanker Katalog-Abzug fuer das eingebettete Backend im Handy: nur Katalogdaten, keine\nNutzerdaten, keine Embeddings, keine Zugangsdaten. Wird bei Bedarf erzeugt und neben der DB abgelegt.\"\"\"\nfrom __future__ import annotations\n\nimport gzip\nimport shutil\nimport sqlite3\nimport tempfile\nfrom pathlib import Path\n\nfrom . import db as dbmod\n\nCATALOG_TABLES = (\"media\", \"services\", \"media_types\")\n\n\ndef build(out: Path | None = None) -> Path:\n    \"\"\"Erzeugt <db>.slim.db.gz (neu, wenn die Quelle neuer ist) und gibt den Pfad zurueck.\"\"\"\n    src = dbmod.DB_PATH\n    out = out or src.with_suffix(\".slim.db.gz\")\n    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:\n        return out\n    with tempfile.TemporaryDirectory() as td:\n        tmp = Path(td) / \"slim.db\"\n        dbmod.DB_PATH = tmp\n        try:\n            dbmod.init_db()\n        finally:\n            dbmod.DB_PATH = src\n        con = sqlite3.connect(tmp)\n        con.execute(\"ATTACH DATABASE ? AS o\", (str(src),))\n        for t in CATALOG_TABLES:\n            cols = [r[1] for r in con.execute(f\"PRAGMA main.table_info({t})\")]\n            ocols = {r[1] for r in con.execute(f\"PRAGMA o.table_info({t})\")}\n            use = [c for c in cols if c in ocols]\n            con.execute(f\"DELETE FROM main.{t}\")\n            con.execute(f\"INSERT INTO main.{t}({','.join(use)}) SELECT {','.join(use)} FROM o.{t}\")\n        con.commit()\n        con.execute(\"DETACH DATABASE o\")\n        con.execute(\"VACUUM\")\n        con.close()\n        part = out.with_suffix(\".part\")\n        with open(tmp, \"rb\") as f_in, gzip.open(part, \"wb\", compresslevel=9) as f_out:\n            shutil.copyfileobj(f_in, f_out)\n        part.replace(out)\n    return out\n\n\nif __name__ == \"__main__\":\n    # python -m app.slim <anime.jsonl> <out.db.gz>  — Katalog-Abzug direkt aus der offenen Datenbank (AnimeDB) bauen\n    import os\n    import sys\n    import tempfile\n\n    jsonl, target = Path(sys.argv[1]), Path(sys.argv[2])\n    with tempfile.TemporaryDirectory() as td:\n        os.environ[\"ANIME_DB\"] = str(Path(td) / \"anime.db\")\n        dbmod.DB_PATH = Path(os.environ[\"ANIME_DB\"])\n        dbmod.init_db()\n        from . import catalog\n        catalog.run(jsonl, dbmod.DB_PATH, progress=lambda *_: None)\n        shutil.copyfile(build(Path(td) / \"out.gz\"), target)\n    print(f\"{target} ({target.stat().st_size} Bytes)\")\n";

const __vite_glob_0_13 = "\"\"\"Externe Datenquellen: AniList (Metadaten), MyDubList (dt. Dub), Jikan/MAL (H).\"\"\"\n";

const __vite_glob_0_14 = "\"\"\"AniList GraphQL — Metadaten-Quelle.\n\nAniList kappt Offset-Paginierung bei ~5000 Ergebnissen pro Abfrage (Seite 100 → HTTP 400).\nDarum: Voll-Katalog per **Jahr-Sharding** (seasonYear) + ein Populär-Sweep für Titel ohne\nseasonYear. 400 wird als „Shard zu Ende\" behandelt, nicht als Crash.\n\"\"\"\nfrom __future__ import annotations\n\nimport time\nfrom typing import Any\n\nimport httpx\n\nENDPOINT = \"https://graphql.anilist.co\"\n\n_FIELDS = \"\"\"\n      id\n      idMal\n      title { romaji english native }\n      synonyms\n      format status episodes seasonYear genres\n      averageScore popularity isAdult\n      coverImage { extraLarge large color }\n      bannerImage\n      description(asHtml: false)\n\"\"\"\n\nQUERY = f\"\"\"\nquery ($page: Int, $perPage: Int, $year: Int) {{\n  Page(page: $page, perPage: $perPage) {{\n    pageInfo {{ hasNextPage }}\n    media(type: ANIME, isAdult: false, seasonYear: $year, sort: POPULARITY_DESC) {{ {_FIELDS} }}\n  }}\n}}\n\"\"\"\n\nQUERY_ADULT = f\"\"\"\nquery ($page: Int, $perPage: Int, $year: Int) {{\n  Page(page: $page, perPage: $perPage) {{\n    pageInfo {{ hasNextPage }}\n    media(type: ANIME, isAdult: true, genre_in: [\"Hentai\"], seasonYear: $year, sort: POPULARITY_DESC) {{ {_FIELDS} }}\n  }}\n}}\n\"\"\"\n\n\ndef _normalize(m: dict[str, Any], space: str = \"normal\") -> dict[str, Any]:\n    t = m.get(\"title\") or {}\n    cover = m.get(\"coverImage\") or {}\n    return {\n        \"space\": space,\n        \"media_type\": \"anime\",\n        \"anilist_id\": m.get(\"id\"),\n        \"mal_id\": m.get(\"idMal\"),\n        \"title_romaji\": t.get(\"romaji\"),\n        \"title_english\": t.get(\"english\"),\n        \"title_native\": t.get(\"native\"),\n        \"synonyms\": m.get(\"synonyms\") or [],\n        \"format\": m.get(\"format\"),\n        \"status\": m.get(\"status\"),\n        \"episodes\": m.get(\"episodes\"),\n        \"season_year\": m.get(\"seasonYear\"),\n        \"genres\": m.get(\"genres\") or [],\n        \"is_adult\": 1 if m.get(\"isAdult\") else 0,\n        \"popularity\": m.get(\"popularity\"),\n        \"average_score\": m.get(\"averageScore\"),\n        \"cover_url\": cover.get(\"extraLarge\") or cover.get(\"large\"),\n        \"banner_url\": m.get(\"bannerImage\"),\n        \"color\": cover.get(\"color\"),\n        \"description_en\": m.get(\"description\"),\n    }\n\n\ndef _pages(client: httpx.Client, query: str, base_vars: dict, per_page: int = 50, max_pages: int = 100, space: str = \"normal\"):\n    \"\"\"Paginiert eine Query; bricht sauber ab bei 400 (AniList-Limit), leerem Resultat oder Ende.\"\"\"\n    for p in range(1, max_pages + 1):\n        r = None\n        for _ in range(4):\n            r = client.post(ENDPOINT, json={\"query\": query, \"variables\": {**base_vars, \"page\": p, \"perPage\": per_page}}, timeout=60)\n            if r.status_code == 429:\n                time.sleep(int(r.headers.get(\"Retry-After\", \"60\")))\n                continue\n            break\n        if r is None or r.status_code >= 400:\n            break  # 400 = Paginierungs-Limit erreicht → Shard zu Ende\n        data = (r.json().get(\"data\") or {}).get(\"Page\")\n        if not data:\n            break\n        yield [_normalize(m, space) for m in data[\"media\"]]\n        if not data[\"pageInfo\"][\"hasNextPage\"]:\n            break\n        time.sleep(2.1)\n\n\ndef iter_all(client: httpx.Client, start_year: int = 2027, end_year: int = 1940, per_page: int = 50):\n    \"\"\"Voll-Katalog: pro Jahr (je < 5000, kein Limit-Crash) + Populär-Sweep für Titel ohne seasonYear.\"\"\"\n    for year in range(start_year, end_year - 1, -1):\n        yield from _pages(client, QUERY, {\"year\": year}, per_page, max_pages=100)\n    yield from _pages(client, QUERY, {\"year\": None}, per_page, max_pages=100)  # populär, inkl. ohne Jahr\n\n\ndef iter_adult(client: httpx.Client, pages: int = 100, per_page: int = 50):\n    \"\"\"H: AniList isAdult + Genre Hentai (Jikan ist IPv6-only).\"\"\"\n    yield from _pages(client, QUERY_ADULT, {\"year\": None}, per_page, max_pages=pages, space=\"h\")\n\n\nQUERY_IDS = f\"\"\"\nquery ($ids: [Int], $perPage: Int) {{\n  Page(perPage: $perPage) {{\n    media(id_in: $ids, type: ANIME) {{ {_FIELDS} }}\n  }}\n}}\n\"\"\"\n\n\ndef fetch_by_ids(client: httpx.Client, ids: list[int], per_page: int = 50) -> list[dict[str, Any]]:\n    \"\"\"Holt konkrete Anime per AniList-ID (für fehlende Titel aus dem Export).\"\"\"\n    out: list[dict[str, Any]] = []\n    for i in range(0, len(ids), per_page):\n        chunk = ids[i : i + per_page]\n        r = None\n        for _ in range(4):\n            r = client.post(ENDPOINT, json={\"query\": QUERY_IDS, \"variables\": {\"ids\": chunk, \"perPage\": per_page}}, timeout=60)\n            if r.status_code == 429:\n                time.sleep(int(r.headers.get(\"Retry-After\", \"60\")))\n                continue\n            break\n        if r is None or r.status_code >= 400:\n            continue\n        data = (r.json().get(\"data\") or {}).get(\"Page\") or {}\n        out.extend(_normalize(m) for m in data.get(\"media\", []))\n        time.sleep(2.1)\n    return out\n\n\n# ---- Kompatibilität: einfache Listen-Varianten (für kleine Importe/Tests) ----\ndef fetch_popular(client: httpx.Client, pages: int = 4, per_page: int = 50) -> list[dict[str, Any]]:\n    out: list[dict[str, Any]] = []\n    for page in _pages(client, QUERY, {\"year\": None}, per_page, max_pages=pages):\n        out.extend(page)\n    return out\n\n\ndef fetch_adult(client: httpx.Client, pages: int = 2, per_page: int = 50) -> list[dict[str, Any]]:\n    out: list[dict[str, Any]] = []\n    for page in iter_adult(client, pages=pages, per_page=per_page):\n        out.extend(page)\n    return out\n";

const __vite_glob_0_15 = "\"\"\"Jikan (MyAnimeList) — Quelle fuer den H-Datenraum (AniList hat H praktisch nicht).\n\nrating=rx = Hentai. Read-only, frei. Rate-Limit ~3/s, 60/min -> sleep.\n\"\"\"\nfrom __future__ import annotations\n\nimport time\nfrom typing import Any\n\nimport httpx\n\nBASE = \"https://api.jikan.moe/v4\"\n\n\ndef _normalize(m: dict[str, Any]) -> dict[str, Any]:\n    images = (m.get(\"images\") or {}).get(\"jpg\") or {}\n    syn = [t.get(\"title\") for t in (m.get(\"titles\") or []) if t.get(\"title\")]\n    return {\n        \"space\": \"h\",\n        \"media_type\": \"anime\",\n        \"mal_id\": m.get(\"mal_id\"),\n        \"title_romaji\": m.get(\"title\"),\n        \"title_english\": m.get(\"title_english\"),\n        \"title_native\": m.get(\"title_japanese\"),\n        \"synonyms\": syn or (m.get(\"title_synonyms\") or []),\n        \"format\": m.get(\"type\"),\n        \"status\": m.get(\"status\"),\n        \"episodes\": m.get(\"episodes\"),\n        \"season_year\": m.get(\"year\"),\n        \"genres\": [g.get(\"name\") for g in (m.get(\"genres\") or []) if g.get(\"name\")],\n        \"is_adult\": 1,\n        \"popularity\": (m.get(\"members\") or 0),\n        \"average_score\": int((m.get(\"score\") or 0) * 10) if m.get(\"score\") else None,\n        \"cover_url\": images.get(\"large_image_url\") or images.get(\"image_url\"),\n        \"description_en\": m.get(\"synopsis\"),\n    }\n\n\ndef fetch_hentai(client: httpx.Client, pages: int = 2, limit: int = 25) -> list[dict[str, Any]]:\n    out: list[dict[str, Any]] = []\n    for p in range(1, pages + 1):\n        r = None\n        for attempt in range(2):\n            try:\n                r = client.get(\n                    f\"{BASE}/anime\",\n                    params={\"rating\": \"rx\", \"order_by\": \"members\", \"sort\": \"desc\", \"page\": p, \"limit\": limit},\n                    timeout=8,\n                )\n            except httpx.TransportError as e:  # Connect/Read-Timeout etc. (Jikan ist IPv6-only)\n                print(f\"  Jikan Netzfehler ({e!r}), Versuch {attempt + 1}/2 …\", flush=True)\n                continue\n            if r.status_code == 429:\n                time.sleep(3)\n                continue\n            r.raise_for_status()\n            break\n        if r is None or r.status_code != 200:\n            raise httpx.TransportError(f\"Jikan Seite {p} nach Retries nicht erreichbar\")\n        out.extend(_normalize(m) for m in r.json().get(\"data\", []))\n        time.sleep(1)  # Jikan-Rate-Limit\n    return out\n";

const __vite_glob_0_16 = "\"\"\"MyDubList (CC BY 4.0) — deutscher Dub-Status + ID-Mapping.\n\nAttribution Pflicht: \"Dub data (c) MyDubList - https://mydublist.com - (CC BY 4.0)\".\nDub-Dateien fuehren MAL-IDs. Tier-Reihenfolge very-high..low (kumulativ).\n\"\"\"\nfrom __future__ import annotations\n\nimport json\nfrom typing import Any\n\nimport httpx\n\nBASE = \"https://raw.githubusercontent.com/Joelis57/MyDubList/main/dubs/\"\nTIERS = [\"very-high\", \"high\", \"normal\", \"low\"]  # bestes zuerst\nATTRIBUTION = \"Dub data © MyDubList - https://mydublist.com - (CC BY 4.0)\"\n\n\ndef load_mappings(client: httpx.Client) -> tuple[dict[int, dict], dict[int, dict]]:\n    \"\"\"Liefert (anilist_id -> {mal,anisearch}, mal_id -> {anilist,anisearch}).\"\"\"\n    a2ids: dict[int, dict] = {}\n    mal2ids: dict[int, dict] = {}\n    r = client.get(BASE + \"mappings/mappings_merged.jsonl\", timeout=90)\n    r.raise_for_status()\n    for line in r.text.splitlines():\n        line = line.strip()\n        if not line:\n            continue\n        try:\n            o = json.loads(line)\n        except Exception:\n            continue\n        mal, al, ani = o.get(\"mal_id\"), o.get(\"anilist_id\"), o.get(\"anisearch_id\")\n        if al is not None:\n            a2ids[al] = {\"mal\": mal, \"anisearch\": ani}\n        if mal is not None:\n            mal2ids[mal] = {\"anilist\": al, \"anisearch\": ani}\n    return a2ids, mal2ids\n\n\nLANGS = [\n    \"german\", \"english\", \"spanish\", \"french\", \"italian\", \"portuguese\", \"japanese\",\n    \"russian\", \"polish\", \"chinese\", \"korean\", \"arabic\", \"hungarian\", \"turkish\", \"dutch\",\n]\n\n\ndef load_all_dub_languages(client: httpx.Client, tier: str = \"high\") -> dict[int, list[str]]:\n    \"\"\"mal_id -> Liste Sprachen mit Dub (für den Mehrsprachen-Filter).\"\"\"\n    mal_to_langs: dict[int, list[str]] = {}\n    for lang in LANGS:\n        try:\n            r = client.get(f\"{BASE}confidence/{tier}/dubbed_{lang}.json\", timeout=60)\n            r.raise_for_status()\n            for mid in r.json().get(\"dubbed\", []):\n                mal_to_langs.setdefault(int(mid), []).append(lang)\n        except Exception:\n            continue\n    return mal_to_langs\n\n\ndef load_dub_tiers(client: httpx.Client) -> dict[int, str]:\n    \"\"\"mal_id -> bester (hoechster) Tier, in dem der Titel als dt.-synchronisiert gilt.\"\"\"\n    tier_of: dict[int, str] = {}\n    for t in TIERS:\n        try:\n            r = client.get(f\"{BASE}confidence/{t}/dubbed_german.json\", timeout=90)\n            r.raise_for_status()\n            ids = r.json().get(\"dubbed\", [])\n        except Exception:\n            ids = []\n        for mid in ids:\n            tier_of.setdefault(int(mid), t)  # erstes (bestes) gewinnt\n    return tier_of\n";

const __vite_glob_0_17 = "\"\"\"Ollama auf nexus (127.0.0.1:11434) — Embeddings (bge-m3) + Uebersetzung (qwen2.5:3b).\"\"\"\nfrom __future__ import annotations\n\nimport os\n\nimport httpx\n\nOLLAMA = os.environ.get(\"OLLAMA_URL\", \"http://127.0.0.1:11434\")\nEMBED_MODEL = os.environ.get(\"EMBED_MODEL\", \"bge-m3\")\nTRANSLATE_MODEL = os.environ.get(\"TRANSLATE_MODEL\", \"qwen2.5:3b\")\nEMBED_DIM = 1024  # bge-m3\n\n\ndef available_models() -> list[str]:\n    try:\n        r = httpx.get(f\"{OLLAMA}/api/tags\", timeout=10)\n        return [m[\"name\"] for m in r.json().get(\"models\", [])]\n    except Exception:\n        return []\n\n\ndef has_model(name: str) -> bool:\n    return any(m == name or m.startswith(name + \":\") for m in available_models())\n\n\ndef embed(texts: list[str]) -> list[list[float]]:\n    from .. import aiconf  # Modus (Server/Extern) kommt aus der KI-Konfiguration\n    return aiconf.embed(texts)\n\n\ndef translate(text: str, target: str = \"Deutsch\") -> str:\n    prompt = (\n        f\"Uebersetze die folgende Anime-Beschreibung ins {target}. \"\n        f\"Gib NUR die Uebersetzung aus, ohne Vorrede, ohne Anfuehrungszeichen.\\n\\n{text}\"\n    )\n    r = httpx.post(\n        f\"{OLLAMA}/api/generate\",\n        json={\"model\": TRANSLATE_MODEL, \"prompt\": prompt, \"stream\": False, \"options\": {\"temperature\": 0.2}},\n        timeout=240,\n    )\n    r.raise_for_status()\n    return r.json()[\"response\"].strip()\n";

const __vite_glob_0_18 = "\"\"\"Streaming-Verfuegbarkeit je Titel (Treffer, die das Geraet geprueft hat) fuer Detailansicht und Wunschliste.\"\"\"\nfrom __future__ import annotations\n\nfrom .db import connect\n\n\ndef set_items(media_id: int, items: list[dict]) -> int:\n    \"\"\"Ersetzt die gespeicherten Treffer des Titels durch die frisch geprueften.\"\"\"\n    con = connect()\n    try:\n        con.execute(\"DELETE FROM streaming WHERE media_id=?\", (media_id,))\n        n = 0\n        for it in items:\n            svc = (it.get(\"service\") or \"\").strip()\n            if not svc:\n                continue\n            con.execute(\n                \"INSERT OR REPLACE INTO streaming (media_id, service, url, source) VALUES (?,?,?,?)\",\n                (media_id, svc, it.get(\"url\"), it.get(\"source\")),\n            )\n            n += 1\n        con.commit()\n        return n\n    finally:\n        con.close()\n\n\ndef get_map(ids: list[int]) -> dict[int, list[dict]]:\n    if not ids:\n        return {}\n    con = connect()\n    try:\n        q = \",\".join(\"?\" for _ in ids)\n        out: dict[int, list[dict]] = {}\n        for r in con.execute(\n            f\"SELECT media_id, service, url, source, checked_at FROM streaming WHERE media_id IN ({q}) ORDER BY service\", ids\n        ):\n            out.setdefault(r[\"media_id\"], []).append(\n                {\"service\": r[\"service\"], \"url\": r[\"url\"], \"source\": r[\"source\"], \"checked_at\": r[\"checked_at\"]}\n            )\n        return out\n    finally:\n        con.close()\n";

const __vite_glob_0_19 = "\"\"\"AniList-Export (einseitig, NUR Anime). Braucht OAuth-Token (Env ANILIST_TOKEN).\n\nNutzt SaveMediaListEntry mit FuzzyDateInput {year,month,day} → umgeht den bekannten\nMCP-Datums-Bug. **H wird NIE synchronisiert** (nur space='normal').\n\nSTUB: Ohne ANILIST_TOKEN wird nichts gesendet; preview() zeigt, was synchronisiert würde.\nJonas-Block: App auf anilist.co/settings/developer registrieren, PIN-Token holen,\nals Secret (sops/agenix) → ANILIST_TOKEN.\n\"\"\"\nfrom __future__ import annotations\n\nimport os\n\nimport httpx\n\nfrom .db import connect\n\nENDPOINT = \"https://graphql.anilist.co\"\nMUTATION = \"\"\"\nmutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {\n  SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {\n    id status score progress\n  }\n}\n\"\"\"\nSTATUS_MAP = {\n    \"watching\": \"CURRENT\", \"planning\": \"PLANNING\", \"completed\": \"COMPLETED\",\n    \"dropped\": \"DROPPED\", \"paused\": \"PAUSED\", \"rewatching\": \"REPEATING\",\n}\n\n\ndef _entries() -> list:\n    con = connect()\n    rows = con.execute(\n        \"SELECT m.anilist_id, m.title_romaji, u.rating, u.watch_status, u.progress \"\n        \"FROM media m JOIN user_entry u ON u.media_id=m.id \"\n        \"WHERE m.space='normal' AND m.anilist_id IS NOT NULL \"\n        \"AND (u.watch_status IS NOT NULL AND u.watch_status<>'none' OR u.rating IS NOT NULL)\"\n    ).fetchall()\n    con.close()\n    return rows\n\n\ndef preview() -> list[dict]:\n    return [\n        {\n            \"anilist_id\": r[\"anilist_id\"],\n            \"title\": r[\"title_romaji\"],\n            \"status\": STATUS_MAP.get(r[\"watch_status\"] or \"none\"),\n            \"score\": r[\"rating\"],\n            \"progress\": r[\"progress\"],\n        }\n        for r in _entries()\n    ]\n\n\ndef run() -> dict:\n    token = os.environ.get(\"ANILIST_TOKEN\")\n    pending = preview()\n    if not token:\n        return {\n            \"status\": \"stub\",\n            \"note\": \"ANILIST_TOKEN nicht gesetzt — Jonas: App auf anilist.co/settings/developer \"\n            \"registrieren, PIN-Token holen, als Secret bereitstellen.\",\n            \"would_sync\": len(pending),\n        }\n    headers = {\"Authorization\": f\"Bearer {token}\"}\n    done, errors = 0, []\n    for e in pending:\n        if not e[\"status\"] and e[\"score\"] is None:\n            continue\n        variables = {\n            \"mediaId\": e[\"anilist_id\"],\n            \"status\": e[\"status\"],\n            \"score\": float(e[\"score\"]) if e[\"score\"] is not None else None,\n            \"progress\": e[\"progress\"] or 0,\n        }\n        try:\n            r = httpx.post(ENDPOINT, json={\"query\": MUTATION, \"variables\": variables}, headers=headers, timeout=30)\n            r.raise_for_status()\n            done += 1\n        except Exception as ex:  # einzelne Fehler sammeln, Rest weiter\n            errors.append(f\"{e['title']}: {ex!r}\")\n    return {\"status\": \"ok\", \"synced\": done, \"errors\": errors[:5]}\n";

const __vite_glob_0_20 = "\"\"\"Watch-Tracker: Jellyfin (REST) + Browser (WebExtension → /watch).\"\"\"\n";

const __vite_glob_0_21 = "\"\"\"Jellyfin-Tracker (REST). Braucht JELLYFIN_URL + JELLYFIN_TOKEN (API-Key).\n\nAniList-ID kommt aus ProviderIds der SERIE (AniO schreibt sie als NFO-uniqueid).\nSTUB ohne Env. Jonas-Block: API-Key im Jellyfin-Dashboard anlegen → Secret.\n\"\"\"\nfrom __future__ import annotations\n\nimport os\n\nimport httpx\n\n\ndef _cfg() -> tuple[str | None, str | None]:\n    return os.environ.get(\"JELLYFIN_URL\"), os.environ.get(\"JELLYFIN_TOKEN\")\n\n\ndef now_playing() -> dict:\n    url, tok = _cfg()\n    if not (url and tok):\n        return {\"status\": \"stub\", \"note\": \"JELLYFIN_URL/JELLYFIN_TOKEN nicht gesetzt — Jonas: API-Key anlegen\"}\n    h = {\"Authorization\": f'MediaBrowser Token=\"{tok}\"'}\n    try:\n        sessions = httpx.get(f\"{url}/Sessions\", headers=h, timeout=15).json()\n    except Exception as e:\n        return {\"status\": \"error\", \"note\": repr(e)}\n    out = []\n    for s in sessions:\n        npi = s.get(\"NowPlayingItem\")\n        if not npi:\n            continue\n        anilist = None\n        sid = npi.get(\"SeriesId\")\n        if sid:\n            try:\n                item = httpx.get(f\"{url}/Items/{sid}\", headers=h, params={\"Fields\": \"ProviderIds\"}, timeout=15).json()\n                pids = {k.lower(): v for k, v in (item.get(\"ProviderIds\") or {}).items()}\n                anilist = pids.get(\"anilist\")\n            except Exception:\n                pass\n        out.append({\n            \"series\": npi.get(\"SeriesName\"),\n            \"season\": npi.get(\"ParentIndexNumber\"),\n            \"episode\": npi.get(\"IndexNumber\"),\n            \"anilist_id\": anilist,\n            \"paused\": (s.get(\"PlayState\") or {}).get(\"IsPaused\"),\n        })\n    return {\"status\": \"ok\", \"playing\": out}\n";

const __vite_glob_0_22 = "\"\"\"Beschreibungen EN->DE via nexus-Ollama (qwen2.5:3b), Ergebnis in SQLite gecacht\n(nie doppelt). Nur importierte Titel, inkrementell.\"\"\"\nfrom __future__ import annotations\n\nfrom .db import connect\nfrom .sources import ollama\n\n\ndef translate_missing(limit: int = 50, space: str | None = None) -> dict:\n    con = connect()\n    where = \"description_en IS NOT NULL AND description_en <> '' AND (description_de IS NULL OR description_de='')\"\n    params: list = []\n    if space:\n        where += \" AND space=?\"\n        params.append(space)\n    params.append(limit)\n    rows = con.execute(f\"SELECT id, description_en FROM media WHERE {where} LIMIT ?\", params).fetchall()\n    n = 0\n    for r in rows:\n        try:\n            de = ollama.translate(r[\"description_en\"][:2000])\n            con.execute(\"UPDATE media SET description_de=? WHERE id=?\", (de, r[\"id\"]))\n            con.commit()\n            n += 1\n            print(f\"  uebersetzt {n}/{len(rows)}\", flush=True)\n        except Exception as e:\n            print(f\"  translate fail id={r['id']}: {e!r}\", flush=True)\n    con.close()\n    return {\"translated\": n, \"requested\": len(rows)}\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    translate_missing(int(sys.argv[1]) if len(sys.argv) > 1 else 50)\n";

const __vite_glob_0_23 = "\"\"\"Nutzerdaten (Liste, Einstellungen) getrennt vom Katalog: Export und Import im Standardformat.\n\n- JSON-Vollbackup (``orbitlist_export``): alle Listenfelder, Einstellungen; Zuordnung beim Import ueber\n  oadb_id → AniList-ID → MAL-ID, damit die Datei mit jedem Katalogstand zusammenpasst.\n- MAL-XML (De-facto-Standard): Import wie Export, nur Status/Fortschritt/Bewertung.\nDas eingebettete Backend sichert damit seine Nutzerdaten (kleine Datei) statt der ganzen Datenbank.\n\"\"\"\nfrom __future__ import annotations\n\nimport json\nimport re\nimport xml.etree.ElementTree as ET\n\nfrom .db import connect, repo\n\nENTRY_COLS = [\"rating\", \"note\", \"watch_status\", \"progress\", \"collection\", \"lent_to\", \"lent_since\",\n              \"favorite\", \"favorite_order\", \"started_at\", \"completed_at\", \"rewatches\"]\nMAL_STATUS = {\"watching\": \"watching\", \"completed\": \"completed\", \"on-hold\": \"paused\", \"onhold\": \"paused\",\n              \"dropped\": \"dropped\", \"plan to watch\": \"planning\", \"plantowatch\": \"planning\"}\nSKIP_META = (\"last_\", \"auth_\", \"pair_token\")  # Laufzeit-/Zugangsdaten gehoeren nicht ins Backup\n\n\ndef export_dict() -> dict:\n    con = connect()\n    try:\n        rows = con.execute(\n            \"SELECT m.oadb_id, m.anilist_id, m.mal_id, m.space, m.title_romaji, m.title_english, \"\n            + \", \".join(f\"u.{c}\" for c in ENTRY_COLS) + \" FROM media m JOIN user_entry u ON u.media_id=m.id \"\n            \"WHERE u.watch_status<>'none' OR u.rating IS NOT NULL OR u.favorite=1 OR u.note IS NOT NULL \"\n            \"OR u.collection<>'none' OR u.lent_to IS NOT NULL\"\n        ).fetchall()\n        meta = {r[\"key\"]: r[\"value\"] for r in con.execute(\"SELECT key, value FROM meta_kv\")\n                if not r[\"key\"].startswith(SKIP_META)}\n        streaming = [dict(r) for r in con.execute(\n            \"SELECT m.oadb_id, m.anilist_id, m.mal_id, s.service, s.url, s.source FROM streaming s JOIN media m ON m.id=s.media_id\")]\n        scores = [dict(r) for r in con.execute(\n            \"SELECT anilist_id, average_score AS score FROM media WHERE anilist_id IS NOT NULL AND average_score IS NOT NULL\")]\n        services = [dict(r) for r in con.execute(\"SELECT * FROM services\")]\n        types = [dict(r) for r in con.execute(\"SELECT * FROM media_types\")]\n    finally:\n        con.close()\n    return {\"orbitlist_export\": 2, \"entries\": [dict(r) for r in rows], \"meta\": meta,\n            \"services\": services, \"media_types\": types, \"streaming\": streaming, \"scores\": scores}\n\n\ndef _find(con, e: dict):\n    for col in (\"oadb_id\", \"anilist_id\", \"mal_id\"):\n        v = e.get(col)\n        if v:\n            r = con.execute(f\"SELECT id FROM media WHERE {col}=? ORDER BY (space='normal') DESC LIMIT 1\", (v,)).fetchone()\n            if r:\n                return r[\"id\"]\n    return None\n\n\ndef _restore_table(con, table: str, rows: list[dict]) -> None:\n    cols = [r[\"name\"] for r in con.execute(f\"PRAGMA table_info({table})\")]\n    con.execute(f\"DELETE FROM {table}\")\n    for r in rows:\n        use = [c for c in cols if c in r]\n        con.execute(f\"INSERT INTO {table}({','.join(use)}) VALUES ({','.join('?' for _ in use)})\", [r[c] for c in use])\n\n\ndef _parse_mal(text: str) -> list[dict]:\n    out = []\n    for a in ET.fromstring(text).iter(\"anime\"):\n        g = lambda t: (a.findtext(t) or \"\").strip()\n        st = MAL_STATUS.get(g(\"my_status\").lower())\n        if not g(\"series_animedb_id\").isdigit() or not st:\n            continue\n        sc = int(g(\"my_score\") or 0)\n        out.append({\"mal_id\": int(g(\"series_animedb_id\")), \"watch_status\": st,\n                    \"progress\": int(g(\"my_watched_episodes\") or 0), \"rating\": sc or None})\n    return out\n\n\ndef import_text(text: str) -> dict:\n    \"\"\"Liest JSON-Vollbackup oder MAL-XML. Eintraege ohne Katalogtreffer werden gezaehlt, nicht erfunden.\"\"\"\n    t = text.lstrip()\n    if t.startswith(\"<\"):\n        data = {\"entries\": _parse_mal(t)}\n    else:\n        data = json.loads(t)\n        if \"orbitlist_export\" not in data:\n            raise ValueError(\"Unbekanntes Format (weder Orbitlist-JSON noch MAL-XML)\")\n    con = connect()\n    matched = missing = 0\n    try:\n        for tbl in (\"services\", \"media_types\"):\n            if data.get(tbl):\n                _restore_table(con, tbl, data[tbl])\n        for k, v in (data.get(\"meta\") or {}).items():\n            if not k.startswith(SKIP_META):\n                con.execute(\"INSERT OR REPLACE INTO meta_kv(key, value) VALUES (?, ?)\", (k, v))\n        con.commit()\n        for e in data.get(\"entries\", []):\n            mid = _find(con, e)\n            if not mid:\n                missing += 1\n                continue\n            patch = {c: e[c] for c in ENTRY_COLS if c in e}\n            if patch:\n                repo.set_user_entry(mid, patch)\n            matched += 1\n        for st in data.get(\"streaming\") or []:\n            mid = _find(con, st)\n            if mid and st.get(\"service\"):\n                con.execute(\"INSERT OR REPLACE INTO streaming (media_id, service, url, source) VALUES (?,?,?,?)\",\n                            (mid, st[\"service\"], st.get(\"url\"), st.get(\"source\")))\n        for sc in data.get(\"scores\") or []:\n            if sc.get(\"anilist_id\") and sc.get(\"score\"):\n                con.execute(\"UPDATE media SET average_score=? WHERE anilist_id=? AND average_score IS NULL\", (sc[\"score\"], sc[\"anilist_id\"]))\n        con.commit()\n    finally:\n        con.close()\n    return {\"entries\": matched + missing, \"matched\": matched, \"not_in_catalog\": missing}\n";

const __vite_glob_1_0 = "\"\"\"Eingebettetes Backend (Pyodide im Handy): ruft die FastAPI-App direkt als ASGI auf, ohne Netzwerk.\n\nDas Plugin legt die App-Quellen nach /app/app, die Datenbank nach /data/anime.db und ruft ``handle``.\nNicht verfuegbar im Handy: sqlite-vec (KI-Suche) und ausgehendes HTTP ueber httpx (AniList-Sync,\nVerfuegbarkeit) — beides wird hier als Stub bereitgestellt und meldet sauber einen Fehler.\n\"\"\"\nimport asyncio\nimport json\nimport os\nimport sys\nimport types\n\nos.environ.setdefault(\"ANIME_DB\", \"/work/anime.db\")\nos.environ.setdefault(\"ORBITLIST_JOURNAL\", \"DELETE\")\nos.environ.setdefault(\"ORBITLIST_UI\", \"/nonexistent\")\n\nif \"sqlite_vec\" not in sys.modules:\n    try:\n        import sqlite_vec  # noqa: F401\n    except Exception:\n        def _nope(*a, **k):\n            raise RuntimeError(\"KI-Suche (sqlite-vec) ist im Handy nicht verfuegbar\")\n        sys.modules[\"sqlite_vec\"] = types.SimpleNamespace(load=_nope, serialize_float32=_nope)\n\nif \"httpx\" not in sys.modules:\n    try:\n        import httpx  # noqa: F401\n    except Exception:\n        def _net(*a, **k):\n            raise RuntimeError(\"Netzwerkzugriff ist im eingebetteten Backend (noch) nicht verfuegbar\")\n        sys.modules[\"httpx\"] = types.SimpleNamespace(get=_net, post=_net, put=_net, request=_net,\n                                                      Client=_net, AsyncClient=_net, HTTPError=Exception)\n\n_app = None\n_started = False\n\n\ndef _no_threads():\n    \"\"\"Pyodide hat keine Threads: sync-Endpunkte laufen direkt in der Ereignisschleife.\"\"\"\n    import starlette.concurrency as sc\n    import fastapi.routing as fr\n    import fastapi.concurrency as fc\n\n    async def inline(func, *args, **kwargs):\n        return func(*args, **kwargs)\n\n    for m in (sc, fr, fc):\n        if hasattr(m, \"run_in_threadpool\"):\n            m.run_in_threadpool = inline\n\n\ndef _load():\n    global _app\n    if _app is None:\n        _no_threads()\n        sys.path.insert(0, \"/app\")\n        from app.main import app  # noqa: PLC0415\n        _app = app\n    return _app\n\n\nasync def _ensure_started():\n    app = _load()\n    global _started\n    if not _started:\n        await app.router.startup()\n        _started = True\n    return app\n\n\nasync def _call(method, path, headers, body):\n    app = await _ensure_started()\n    p, _, q = path.partition(\"?\")\n    scope = {\n        \"type\": \"http\", \"asgi\": {\"version\": \"3.0\"}, \"http_version\": \"1.1\", \"method\": method.upper(),\n        \"scheme\": \"http\", \"path\": p, \"raw_path\": p.encode(), \"query_string\": q.encode(), \"root_path\": \"\",\n        \"headers\": [(k.lower().encode(), str(v).encode()) for k, v in (headers or {}).items()],\n        \"client\": (\"127.0.0.1\", 0), \"server\": (\"127.0.0.1\", 0),\n    }\n    sent = False\n    out = {\"status\": 500, \"headers\": {}, \"body\": b\"\"}\n\n    async def receive():\n        nonlocal sent\n        if not sent:\n            sent = True\n            return {\"type\": \"http.request\", \"body\": body or b\"\", \"more_body\": False}\n        return {\"type\": \"http.disconnect\"}\n\n    async def send(msg):\n        if msg[\"type\"] == \"http.response.start\":\n            out[\"status\"] = msg[\"status\"]\n            out[\"headers\"] = {k.decode(): v.decode() for k, v in msg.get(\"headers\", [])}\n        elif msg[\"type\"] == \"http.response.body\":\n            out[\"body\"] += msg.get(\"body\", b\"\")\n\n    await app(scope, receive, send)\n    return out\n\n\nasync def handle(method, path, headers_json=\"{}\", body=\"\"):\n    \"\"\"Gibt (status, content_type, body_text) zurueck.\"\"\"\n    r = await _call(method, path, json.loads(headers_json or \"{}\"), body.encode() if isinstance(body, str) else body)\n    return json.dumps({\"status\": r[\"status\"], \"headers\": r[\"headers\"], \"body\": r[\"body\"].decode(\"utf-8\", \"replace\")})\n\n\n# ---- KI-Suche auf dem Geraet: das Plugin (TypeScript) rechnet Einbettungen und Aehnlichkeit selbst;\n# hier nur Datenzugriff auf die Arbeitsdatenbank. Rueckgabe jeweils JSON-Text.\nasync def ai_count():\n    await _ensure_started()\n    from app.db import connect\n    con = connect()\n    try:\n        return json.dumps(con.execute(\"SELECT COUNT(*) FROM media\").fetchone()[0])\n    finally:\n        con.close()\n\n\nasync def ai_docs(after, limit):\n    \"\"\"Texte-Rohdaten der naechsten `limit` Titel mit id > after (aufsteigend).\"\"\"\n    await _ensure_started()\n    from app.db import connect\n    con = connect()\n    try:\n        cols = {r[1] for r in con.execute(\"PRAGMA table_info(media)\")}\n        want = [\"id\", \"title_english\", \"title_romaji\", \"title_native\", \"title_de\", \"synonyms\", \"genres\",\n                \"studios\", \"format\", \"season_year\", \"description_de\", \"description_en\"]\n        sel = \", \".join(c if c in cols else f\"NULL AS {c}\" for c in want)\n        rows = con.execute(f\"SELECT {sel} FROM media WHERE id>? ORDER BY id LIMIT ?\", (int(after), int(limit))).fetchall()\n        return json.dumps([dict(r) for r in rows])\n    finally:\n        con.close()\n\n\nasync def ai_allowed(space, new_for_me, filters_json, h_password=\"\"):\n    await _ensure_started()\n    from app import embeddings\n    if space == \"h\":\n        from app.main import _h_ok\n        if not _h_ok(h_password or None):\n            return json.dumps({\"forbidden\": True, \"ids\": []})\n    f = json.loads(filters_json or \"{}\")\n    return json.dumps({\"forbidden\": False, \"ids\": embeddings.allowed_ids(space, bool(new_for_me), f)})\n\n\nasync def ai_fetch(ids_json, distances_json=\"[]\"):\n    await _ensure_started()\n    from app import embeddings\n    return json.dumps(embeddings.fetch_ordered(json.loads(ids_json), json.loads(distances_json)), default=str)\n";

const DEFAULT_CFG = {
  enabled: false,
  mode: "device",
  hf_model: "",
  ext_kind: "ollama",
  ext_url: "",
  ext_model: "",
  ext_key: ""
};
function modelId(c) {
  if (c.mode === "device") return c.hf_model ? `device:${c.hf_model.trim()}` : "";
  return c.ext_model ? `external:${c.ext_kind}:${c.ext_model.trim()}` : "";
}
function jsonList(s) {
  if (Array.isArray(s)) return s.map(String);
  if (typeof s !== "string" || !s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
function stripHtml(s) {
  if (!s) return "";
  return s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\(\s*(Source|Quelle|Zeitsrc)[^)]*\)\s*$/i, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
function buildDoc(r, maxDesc = 700) {
  const titles = [];
  for (const t of [r.title_de, r.title_english, r.title_romaji, r.title_native]) {
    const v = (t || "").trim();
    if (v && !titles.some((x) => x.toLowerCase() === v.toLowerCase())) titles.push(v);
  }
  const syn = jsonList(r.synonyms).filter((s) => !titles.includes(s)).slice(0, 6);
  const genres = jsonList(r.genres);
  const studios = jsonList(r.studios);
  const parts = [titles.join(" / ")];
  const meta = [r.format, r.season_year].filter(Boolean).join(" ");
  if (meta) parts.push(meta);
  if (syn.length) parts.push("Auch: " + syn.join(", "));
  if (genres.length) parts.push("Genres: " + genres.join(", "));
  if (studios.length) parts.push("Studio: " + studios.join(", "));
  const desc = stripHtml(r.description_de) || stripHtml(r.description_en);
  if (desc) parts.push(desc.slice(0, maxDesc));
  return parts.filter(Boolean).join(". ");
}
function modelProfile(name) {
  const n = name.toLowerCase();
  if (/\be5\b|[-_/]e5[-_]/.test(n)) return { queryPrefix: "query: ", docPrefix: "passage: ", pooling: "mean" };
  if (/bge/.test(n)) return { queryPrefix: "", docPrefix: "", pooling: "cls" };
  return { queryPrefix: "", docPrefix: "", pooling: "mean" };
}
const SUGGESTIONS = [
  { name: "Xenova/all-MiniLM-L6-v2", tier: "sehr klein", mb: 23, note: "nur Englisch — für deutsche Suche schwach" },
  { name: "Xenova/multilingual-e5-small", tier: "klein", mb: 118, note: "mehrsprachig, gut für Deutsch" },
  { name: "Xenova/multilingual-e5-base", tier: "mittel", mb: 279, note: "mehrsprachig, genauer, langsamer" },
  { name: "Xenova/bge-m3", tier: "groß", mb: 570, note: "sehr genau, aber schwer — eher Desktop/viel RAM" }
];
function recommend(memGb) {
  if (memGb === void 0) return { name: "Xenova/multilingual-e5-small", why: "Arbeitsspeicher des Geräts nicht ermittelbar — vorsichtig mit dem kleinen Modell starten." };
  if (memGb <= 2) return { name: "Xenova/multilingual-e5-small", why: `Dein Gerät meldet ${memGb} GB RAM — das kleine Modell ist die vorsichtige Wahl.` };
  if (memGb < 8) return { name: "Xenova/multilingual-e5-small", why: `Dein Gerät meldet ${memGb} GB RAM — das kleine Modell läuft sicher, das mittlere könnte gehen.` };
  return { name: "Xenova/multilingual-e5-base", why: `Dein Gerät meldet ${memGb} GB RAM oder mehr — das mittlere Modell sollte gehen.` };
}
function normalize(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  const o = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) o[i] = v[i] / n;
  return o;
}
function quantize(v) {
  const o = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) o[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
  return o;
}
function newChunk(size, dim, fmt) {
  return { n: 0, ids: new Int32Array(size), data: fmt === "i8" ? new Int8Array(size * dim) : new Float32Array(size * dim) };
}
function chunkAdd(c, dim, fmt, id, v) {
  if (c.n >= c.ids.length) return false;
  c.ids[c.n] = id;
  const off = c.n * dim;
  if (fmt === "i8") c.data.set(quantize(v), off);
  else c.data.set(v, off);
  c.n++;
  return true;
}
function chunkPack(c, dim) {
  return { n: c.n, ids: c.ids.slice(0, c.n), data: c.data.slice(0, c.n * dim) };
}
function chunkUnpack(p, size, dim, fmt) {
  const c = newChunk(Math.max(size, p.n), dim, fmt);
  c.ids.set(p.ids.subarray(0, p.n));
  c.data.set(p.data.subarray(0, p.n * dim));
  c.n = p.n;
  return c;
}
function rankCosine(q, chunks, dim, fmt, allowed, k) {
  const best = [];
  let worst = -Infinity;
  const scale = fmt === "i8" ? 1 / 127 : 1;
  for (const c of chunks) {
    for (let i = 0; i < c.n; i++) {
      const id = c.ids[i];
      if (allowed && !allowed.has(id)) continue;
      const off = i * dim;
      let s = 0;
      for (let d = 0; d < dim; d++) s += q[d] * c.data[off + d];
      s *= scale;
      if (best.length < k || s > worst) {
        let p = best.length;
        while (p > 0 && best[p - 1].score < s) p--;
        best.splice(p, 0, { id, score: s });
        if (best.length > k) best.pop();
        worst = best.length >= k ? best[best.length - 1].score : -Infinity;
      }
    }
  }
  return best;
}
function parseEmbedResponse(kind, j) {
  if (kind === "ollama") {
    if (Array.isArray(j?.embeddings)) return j.embeddings;
    if (Array.isArray(j?.embedding)) return [j.embedding];
    throw new Error(j?.error ? String(j.error) : "Unerwartete Antwort des Ollama-Endpunkts.");
  }
  if (Array.isArray(j?.data)) return [...j.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
  const msg = j?.error?.message || j?.error;
  throw new Error(msg ? String(msg) : "Unerwartete Antwort des OpenAI-kompatiblen Endpunkts.");
}
function embedUrl(kind, base) {
  const b = base.trim().replace(/\/+$/, "");
  return kind === "ollama" ? `${b}/api/embed` : `${b}/v1/embeddings`;
}
class ProgressAgg {
  constructor() {
    this.files = /* @__PURE__ */ new Map();
  }
  /** Ereignis von Transformers.js (progress_callback). Liefert Gesamtprozent 0..100 oder null. */
  feed(e) {
    if (!e || !e.file) return null;
    const f = this.files.get(e.file) || { loaded: 0, total: 0, done: false };
    if (e.status === "progress" || e.status === "download") {
      if (typeof e.total === "number" && e.total > 0) f.total = e.total;
      if (typeof e.loaded === "number") f.loaded = e.loaded;
    } else if (e.status === "done") {
      f.done = true;
      if (f.total) f.loaded = f.total;
    }
    this.files.set(e.file, f);
    let L = 0, T = 0;
    for (const v of this.files.values()) {
      L += v.loaded;
      T += v.total;
    }
    return T > 0 ? Math.min(100, Math.round(L / T * 100)) : null;
  }
}
function etaText(secs) {
  if (!isFinite(secs) || secs < 0) return "";
  if (secs < 90) return `noch ca. ${Math.max(1, Math.round(secs))} s`;
  if (secs < 5400) return `noch ca. ${Math.round(secs / 60)} min`;
  return `noch ca. ${(secs / 3600).toFixed(1).replace(".", ",")} h`;
}

function idbKV(dbName = "orbitlist-ai") {
  let db = null;
  const open = () => db ??= new Promise((res, rej) => {
    const r = indexedDB.open(dbName, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, f) => {
    const d = await open();
    return new Promise((res, rej) => {
      const r = f(d.transaction("kv", mode).objectStore("kv"));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  };
  return {
    get: (k) => tx("readonly", (s) => s.get(k)),
    put: async (k, v) => {
      await tx("readwrite", (s) => s.put(v, k));
    },
    del: async (k) => {
      await tx("readwrite", (s) => s.delete(k));
    },
    keys: async (p) => (await tx("readonly", (s) => s.getAllKeys())).filter((k) => String(k).startsWith(p))
  };
}
const CHUNK = 1024;
const FMT = "i8";
class Index {
  constructor(kv, modelId, dim, fmt = FMT) {
    this.kv = kv;
    this.modelId = modelId;
    this.dim = dim;
    this.fmt = fmt;
    this.chunks = [];
    this.have = /* @__PURE__ */ new Set();
  }
  get count() {
    return this.have.size;
  }
  static key(modelId) {
    return { meta: `ai:meta:${modelId}`, chunk: (n) => `ai:chunk:${modelId}:${n}` };
  }
  /** Vorhandenen Index laden; null = fuer dieses Modell gibt es noch keinen. */
  static async load(kv, modelId) {
    const K = Index.key(modelId);
    const meta = await kv.get(K.meta);
    if (!meta) return null;
    const ix = new Index(kv, modelId, meta.dim, meta.fmt);
    for (let n = 0; n < meta.chunks; n++) {
      const p = await kv.get(K.chunk(n));
      if (!p) break;
      const c = chunkUnpack(p, n === meta.chunks - 1 ? CHUNK : p.n, meta.dim, meta.fmt);
      ix.chunks.push(c);
      for (let i = 0; i < c.n; i++) ix.have.add(c.ids[i]);
    }
    return ix;
  }
  /** Haengt Vektoren an (bereits normalisiert) und schreibt nur den letzten Block + Meta. */
  async add(items) {
    const K = Index.key(this.modelId);
    const touched = /* @__PURE__ */ new Set();
    for (const it of items) {
      if (this.have.has(it.id)) continue;
      if (it.vec.length !== this.dim) throw new Error(`Vektor hat ${it.vec.length} statt ${this.dim} Dimensionen.`);
      let c = this.chunks[this.chunks.length - 1];
      if (!c || !chunkAdd(c, this.dim, this.fmt, it.id, it.vec)) {
        c = newChunk(CHUNK, this.dim, this.fmt);
        this.chunks.push(c);
        chunkAdd(c, this.dim, this.fmt, it.id, it.vec);
      }
      touched.add(this.chunks.length - 1);
      this.have.add(it.id);
    }
    for (const n of touched) await this.kv.put(K.chunk(n), chunkPack(this.chunks[n], this.dim));
    const meta = { modelId: this.modelId, dim: this.dim, fmt: this.fmt, chunks: this.chunks.length, count: this.have.size, updated: Date.now() };
    await this.kv.put(K.meta, meta);
  }
  async clear() {
    const K = Index.key(this.modelId);
    for (let n = 0; n < this.chunks.length; n++) await this.kv.del(K.chunk(n));
    await this.kv.del(K.meta);
    this.chunks = [];
    this.have = /* @__PURE__ */ new Set();
  }
  /** Index eines Modells loeschen, auch wenn er nicht geladen ist. */
  static async remove(kv, modelId) {
    const K = Index.key(modelId);
    const meta = await kv.get(K.meta);
    for (let n = 0; n < (meta?.chunks ?? 0); n++) await kv.del(K.chunk(n));
    await kv.del(K.meta);
  }
}

const TRANSFORMERS_VERSION = "3.8.1";
const TRANSFORMERS_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/+esm`;
const defaultPost = async (url, headers, body) => {
  const cap = globalThis.Capacitor;
  const nativeHttp = cap?.isNativePlatform?.() ? cap?.Plugins?.CapacitorHttp : null;
  if (nativeHttp) {
    const r2 = await nativeHttp.request({ url, method: "POST", headers: { "content-type": "application/json", ...headers }, data: body, connectTimeout: 1e4, readTimeout: 18e4 });
    return { status: r2.status, text: typeof r2.data === "string" ? r2.data : JSON.stringify(r2.data) };
  }
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
};
function netHint(url) {
  const plain = /^http:\/\//i.test(url);
  return plain ? "Verbindung fehlgeschlagen. Android sperrt Klartext-HTTP — der Endpunkt braucht HTTPS (z. B. über einen Reverse-Proxy). Am Desktop: läuft der Dienst, und erlaubt er Anfragen von dieser App (bei Ollama OLLAMA_ORIGINS)?" : "Verbindung fehlgeschlagen. Adresse, Netz/VPN und Zertifikat prüfen.";
}
function externalEmbedder(cfg, post = defaultPost, retryMs = 2e3) {
  if (!cfg.ext_url || !cfg.ext_model) throw new Error("Adresse und Modellname des externen Endpunkts fehlen.");
  const url = embedUrl(cfg.ext_kind, cfg.ext_url);
  const headers = cfg.ext_key ? { Authorization: `Bearer ${cfg.ext_key}` } : {};
  const e = {
    dim: 0,
    async embed(texts) {
      let r;
      for (let versuch = 0; ; versuch++) {
        try {
          r = await post(url, headers, { model: cfg.ext_model, input: texts });
        } catch {
          throw new Error(netHint(url));
        }
        if ((r.status === 429 || r.status === 502 || r.status === 503) && versuch < 3) {
          await new Promise((res) => setTimeout(res, retryMs * (versuch + 1)));
          continue;
        }
        break;
      }
      let j;
      try {
        j = JSON.parse(r.text);
      } catch {
        j = null;
      }
      if (r.status < 200 || r.status >= 300) {
        const msg = j?.error?.message || (typeof j?.error === "string" ? j.error : "") || r.text.slice(0, 160);
        throw new Error(`Endpunkt antwortet mit Status ${r.status}${msg ? ": " + msg : ""}`);
      }
      const vs = parseEmbedResponse(cfg.ext_kind, j);
      if (vs.length !== texts.length) throw new Error("Der Endpunkt hat eine andere Anzahl Vektoren geliefert als angefragt.");
      const out = vs.map((v) => normalize(v));
      e.dim = out[0]?.length ?? e.dim;
      return out;
    }
  };
  return e;
}
const cdnLoader = () => import(
  /* @vite-ignore */
  TRANSFORMERS_URL
);
const MAX_TOKENS = 256;
async function localEmbedder(hfModel, o = {}) {
  const name = hfModel.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(name) || name.split("/").some((x) => /^\.+$/.test(x))) throw new Error("Modellname bitte im Format „Autor/Modell“ eintragen, z. B. Xenova/multilingual-e5-small.");
  const prof = modelProfile(name);
  o.onProgress?.(null, "Laufzeit (Transformers.js) wird geladen …");
  let tf;
  try {
    tf = await (o.loader ?? cdnLoader)();
  } catch {
    throw new Error("Die Laufzeit konnte nicht geladen werden (jsDelivr). Internetverbindung prüfen.");
  }
  tf.env.allowLocalModels = false;
  tf.env.useBrowserCache = typeof caches !== "undefined";
  const agg = new ProgressAgg();
  const cb = (e2) => {
    const pct = agg.feed(e2);
    if (pct !== null) o.onProgress?.(pct, `Modell wird heruntergeladen … ${pct} %`);
  };
  let pipe;
  const mk = (dtype) => tf.pipeline("feature-extraction", name, { dtype, progress_callback: cb, ...o.device ? { device: o.device } : {} });
  o.onProgress?.(0, "Modell wird heruntergeladen …");
  try {
    try {
      pipe = await mk("q8");
    } catch (e1) {
      if (/40[134]|not found|Could not locate|Unauthorized/i.test(String(e1?.message))) {
        pipe = await mk("fp32");
      } else throw e1;
    }
  } catch (e2) {
    const m = String(e2?.message || e2);
    if (/40[134]|not found|Could not locate|Unauthorized/i.test(m))
      throw new Error(`„${name}“ ist auf Hugging Face nicht als ONNX-Modell zu finden. Gesucht wird ein Repo mit onnx-Ordner (meist von „Xenova“ oder „onnx-community“).`);
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) throw new Error("Download fehlgeschlagen — Internetverbindung prüfen und erneut starten (Teile sind zwischengespeichert).");
    throw new Error("Modell konnte nicht gestartet werden: " + m.slice(0, 200));
  }
  try {
    if (pipe.tokenizer) pipe.tokenizer.model_max_length = o.maxTokens ?? MAX_TOKENS;
  } catch {
  }
  o.onProgress?.(100, "Modell bereit.");
  const e = {
    dim: 0,
    async embed(texts, kind) {
      const pre = kind === "query" ? prof.queryPrefix : prof.docPrefix;
      const out = await pipe(texts.map((t) => pre + t), { pooling: prof.pooling, normalize: true });
      const [n, d] = out.dims;
      const data = out.data;
      const res = [];
      for (let i = 0; i < n; i++) res.push(normalize(data.subarray(i * d, (i + 1) * d)));
      e.dim = d;
      return res;
    }
  };
  return e;
}

const ok = (o) => ({ status: 200, body: JSON.stringify(o) });
const err = (status, detail) => ({ status, body: JSON.stringify({ detail }) });
const LS_KEY = "orbitlist.ai";
const FILTER_KEYS = ["genre", "genres", "format", "status", "year_min", "year_max", "dub", "dub_lang", "media_type", "watch_status", "seen", "favorite", "rating", "tags", "season", "country", "source", "studio"];
function createAi(d) {
  const kv = d.kv ?? idbKV();
  const post = d.post ?? defaultPost;
  const storage = d.storage ?? { get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }, set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
    }
  } };
  const memGb = d.memGb ?? (() => globalThis.navigator?.deviceMemory);
  let cfg = { ...DEFAULT_CFG };
  try {
    cfg = { ...DEFAULT_CFG, ...JSON.parse(storage.get(LS_KEY) || "{}") };
  } catch {
  }
  const saveCfg = () => storage.set(LS_KEY, JSON.stringify(cfg));
  const st = {
    phase: "idle",
    pct: 0,
    msg: "",
    eta: "",
    running: false,
    done: 0,
    total: 0,
    error: null
  };
  let emb = null;
  let embLoading = null;
  let index = null;
  const loading = /* @__PURE__ */ new Map();
  let stop = false;
  let job = null;
  async function getEmbedder() {
    const id = modelId(cfg);
    if (!id) throw new Error(cfg.mode === "device" ? "Noch kein Modell gewählt (Hugging-Face-Name eintragen)." : "Adresse und Modellname des externen Endpunkts fehlen.");
    if (emb && emb.id === id) return emb.e;
    if (embLoading) return embLoading;
    const mine = (async () => {
      emb = null;
      if (cfg.mode === "external") {
        const e = externalEmbedder(cfg, post);
        emb = { id, e };
        return e;
      }
      st.phase = "loading";
      st.pct = 0;
      st.msg = "Modell wird vorbereitet …";
      try {
        const e = await localEmbedder(cfg.hf_model, {
          loader: d.loader ?? cdnLoader,
          device: d.device,
          onProgress: (p, m) => {
            if (p !== null) st.pct = p;
            st.msg = m;
          }
        });
        emb = { id, e };
        return e;
      } finally {
        if (st.phase === "loading") st.phase = "idle";
      }
    })();
    embLoading = mine;
    try {
      return await mine;
    } finally {
      embLoading = null;
    }
  }
  async function getIndex(create, dim = 0) {
    const id = modelId(cfg);
    if (!id) return null;
    if (index && index.modelId === id) return index;
    let pending = loading.get(id);
    if (!pending) {
      pending = Index.load(kv, id).finally(() => loading.delete(id));
      loading.set(id, pending);
    }
    const loaded = await pending;
    if (index && index.modelId === id) return index;
    index = loaded;
    if (!index && create) index = new Index(kv, id, dim);
    return index;
  }
  function problem(ix) {
    if (!cfg.enabled) return "KI-Funktionen sind deaktiviert (Einstellungen → KI)";
    if (!modelId(cfg)) return cfg.mode === "device" ? "Noch kein Modell gewählt (Einstellungen → KI)" : "Externer Endpunkt nicht vollständig eingetragen (Einstellungen → KI)";
    if (!ix || ix.count === 0) return "Für dieses Modell ist noch kein Index aufgebaut — in den Einstellungen starten";
    return null;
  }
  async function runIndex(rebuild) {
    stop = false;
    st.running = true;
    st.error = null;
    st.done = 0;
    st.total = 0;
    st.eta = "";
    try {
      const e = await getEmbedder();
      const probe = await e.embed([buildDoc({ title_english: "Test" })], "doc");
      const dim = probe[0].length;
      let ix = await getIndex(true, dim);
      if (ix && rebuild) {
        await ix.clear();
        ix = index = new Index(kv, modelId(cfg), dim);
      }
      if (ix && ix.dim !== dim) {
        throw new Error(`Das Modell liefert jetzt ${dim} statt ${ix.dim} Dimensionen — „Index komplett neu aufbauen“ wählen.`);
      }
      const index2 = ix;
      const media = await d.host.count();
      st.total = media;
      st.done = index2.count;
      st.phase = "indexing";
      st.pct = media ? Math.round(st.done / media * 100) : 100;
      st.msg = "Index wird aufgebaut …";
      const bs = cfg.mode === "device" ? 8 : 32;
      const t0 = Date.now();
      const done0 = st.done;
      let cursor = 0;
      while (!stop) {
        const rows = await d.host.docs(cursor, 128);
        if (!rows.length) break;
        cursor = rows[rows.length - 1].id;
        const todo = rows.filter((r) => !index2.have.has(r.id));
        for (let i = 0; i < todo.length && !stop; i += bs) {
          const part = todo.slice(i, i + bs);
          const vecs = await e.embed(part.map((r) => buildDoc(r)), "doc");
          await index2.add(part.map((r, k) => ({ id: r.id, vec: vecs[k] })));
          st.done = index2.count;
          st.pct = media ? Math.min(100, Math.round(st.done / media * 100)) : 100;
          const secs = (Date.now() - t0) / 1e3;
          const rate = (st.done - done0) / Math.max(secs, 1e-3);
          st.eta = rate > 0 ? etaText((media - st.done) / rate) : "";
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      st.phase = stop ? "idle" : "ready";
      st.msg = stop ? "Pausiert — beim nächsten Start geht es dort weiter." : "Index fertig.";
      st.eta = "";
    } catch (ex) {
      st.phase = "error";
      st.error = String(ex?.message || ex).slice(0, 300);
      st.msg = "";
    } finally {
      st.running = false;
    }
  }
  async function status() {
    const ix = await getIndex(false);
    const media = await d.host.count().catch(() => 0);
    const id = modelId(cfg);
    return ok({
      embed_model: cfg.mode === "device" ? cfg.hf_model : cfg.ext_model,
      embed_ready: !!ix && ix.count > 0,
      translate_model: "",
      translate_ready: false,
      problem: problem(ix),
      indexing: { running: st.running, done: st.done, total: st.total, error: st.error },
      embedded: ix?.count ?? 0,
      media,
      local: { phase: st.phase, pct: st.pct, msg: st.msg, eta: st.eta, model_id: id, dim: ix?.dim ?? 0 }
    });
  }
  function cfgOut() {
    const id = modelId(cfg);
    return {
      enabled: cfg.enabled,
      mode: cfg.mode,
      hf_model: cfg.hf_model,
      ext_kind: cfg.ext_kind,
      ext_url: cfg.ext_url,
      ext_model: cfg.ext_model,
      ext_key_set: !!cfg.ext_key,
      index_model: index && index.modelId === id ? id : "",
      index_dim: index?.dim ?? 0,
      device_mem_gb: memGb() ?? null,
      recommended: recommend(memGb())
    };
  }
  async function putConfig(p) {
    const old = modelId(cfg);
    if (typeof p.enabled === "boolean") cfg.enabled = p.enabled;
    if (p.mode !== void 0) {
      if (p.mode === "server") p.mode = "device";
      if (p.mode !== "device" && p.mode !== "external") return err(400, "mode ungueltig");
      cfg.mode = p.mode;
    }
    if (typeof p.hf_model === "string") cfg.hf_model = p.hf_model.trim();
    if (p.ext_kind === "openai" || p.ext_kind === "ollama") cfg.ext_kind = p.ext_kind;
    if (typeof p.ext_url === "string") cfg.ext_url = p.ext_url.trim().replace(/\/+$/, "");
    if (typeof p.ext_model === "string") cfg.ext_model = p.ext_model.trim();
    if (typeof p.ext_key === "string") cfg.ext_key = p.ext_key;
    saveCfg();
    if (old !== modelId(cfg) || p.ext_url !== void 0 || p.ext_key !== void 0) {
      emb = null;
      if (!st.running) {
        st.phase = "idle";
        st.error = null;
        st.msg = "";
      }
    }
    if (old !== modelId(cfg) && !st.running) index = null;
    await getIndex(false);
    return ok(cfgOut());
  }
  async function test() {
    try {
      const e = await getEmbedder();
      const v = (await e.embed(["Test"], "query"))[0];
      return ok({ ok: true, dim: v.length, model: modelId(cfg) });
    } catch (ex) {
      st.phase = "error";
      st.error = null;
      return ok({ ok: false, error: String(ex?.message || ex).slice(0, 300) });
    }
  }
  async function search(q, headers) {
    const query = (q.get("q") || "").trim();
    if (!query) return err(422, "q fehlt");
    const space = q.get("space") || "normal";
    const ix = await getIndex(false);
    const pr = problem(ix);
    if (pr) return err(503, pr);
    const limit = Math.min(50, Math.max(1, parseInt(q.get("limit") || "20", 10) || 20));
    const filters = {};
    for (const k of FILTER_KEYS) {
      const v = q.get(k);
      if (v !== null && v !== "") filters[k] = v;
    }
    for (const k of ["dub"]) if (k in filters) filters[k] = filters[k] === "true" || filters[k] === "1";
    for (const k of ["year_min", "year_max", "rating"]) if (k in filters) filters[k] = parseInt(String(filters[k]), 10);
    const hpw = headers["x-h-password"] || headers["X-H-Password"] || "";
    const newForMe = q.get("new_for_me") === "true";
    let qv;
    try {
      const e = await getEmbedder();
      qv = normalize((await e.embed([query], "query"))[0]);
    } catch (ex) {
      return err(503, String(ex?.message || ex).slice(0, 300));
    }
    if (qv.length !== ix.dim) return err(503, "Der Index passt nicht zum Modell — in den Einstellungen neu aufbauen");
    const al = await d.host.allowed(space, newForMe, filters, hpw);
    if (al.forbidden) return err(403, "gesperrt");
    const hits = rankCosine(qv, ix.chunks, ix.dim, ix.fmt, new Set(al.ids), limit);
    const rows = await d.host.fetch(hits.map((h) => h.id), hits.map((h) => 1 - h.score));
    return ok({ query, new_for_me: newForMe, results: rows, partial: st.running ? { done: ix.count, total: st.total } : void 0 });
  }
  async function route(method, url, headers, body) {
    const u = new URL(url, "http://local");
    const path = u.pathname.replace(/\/+$/, "");
    const m = method.toUpperCase();
    try {
      if (path === "/ai/status" && m === "GET") return await status();
      if (path === "/ai/config" && m === "GET") return ok(cfgOut());
      if (path === "/ai/config" && m === "PUT") return await putConfig(JSON.parse(body || "{}"));
      if (path === "/ai/test" && m === "POST") return await test();
      if (path === "/ai/index" && m === "POST") {
        if (st.running) return ok({ started: false, running: true });
        if (!cfg.enabled) return err(503, "KI-Funktionen sind deaktiviert");
        job = runIndex(u.searchParams.get("rebuild") === "true");
        return ok({ started: true });
      }
      if (path === "/ai/index" && m === "DELETE") {
        if (st.running) return err(409, "Der Index wird gerade aufgebaut — erst pausieren.");
        const id = modelId(cfg);
        if (id) await Index.remove(kv, id);
        index = null;
        st.done = 0;
        return ok({ ok: true });
      }
      if (path === "/ai/stop" && m === "POST") {
        stop = true;
        return ok({ ok: true });
      }
      if (path === "/ai/search" && m === "GET") return await search(u.searchParams, headers);
      return err(404, "Unbekannte KI-Route");
    } catch (ex) {
      return err(500, String(ex?.message || ex).slice(0, 300));
    }
  }
  return { route, whenIdle: async () => {
    await job;
  } };
}

/* embedded.svelte.ts generated by Svelte v5.57.3 */

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
const PIP = ["fastapi==0.115.6", "starlette==0.41.3"];
const PKGS = ["micropip", "pydantic", "sqlite3", "ssl"];
const LS = "orbitlist.embedded";

const SOURCES = Object.assign({
	"../../../backend/app/__init__.py": __vite_glob_0_0,
	"../../../backend/app/aiconf.py": __vite_glob_0_1,
	"../../../backend/app/anilist_import.py": __vite_glob_0_2,
	"../../../backend/app/auth.py": __vite_glob_0_3,
	"../../../backend/app/availability.py": __vite_glob_0_4,
	"../../../backend/app/catalog.py": __vite_glob_0_5,
	"../../../backend/app/db.py": __vite_glob_0_6,
	"../../../backend/app/embeddings.py": __vite_glob_0_7,
	"../../../backend/app/import_export.py": __vite_glob_0_8,
	"../../../backend/app/importer.py": __vite_glob_0_9,
	"../../../backend/app/main.py": __vite_glob_0_10,
	"../../../backend/app/populate_langs.py": __vite_glob_0_11,
	"../../../backend/app/slim.py": __vite_glob_0_12,
	"../../../backend/app/sources/__init__.py": __vite_glob_0_13,
	"../../../backend/app/sources/anilist.py": __vite_glob_0_14,
	"../../../backend/app/sources/jikan.py": __vite_glob_0_15,
	"../../../backend/app/sources/mydublist.py": __vite_glob_0_16,
	"../../../backend/app/sources/ollama.py": __vite_glob_0_17,
	"../../../backend/app/streaming.py": __vite_glob_0_18,
	"../../../backend/app/sync_anilist.py": __vite_glob_0_19,
	"../../../backend/app/tracker/__init__.py": __vite_glob_0_20,
	"../../../backend/app/tracker/jellyfin.py": __vite_glob_0_21,
	"../../../backend/app/translate.py": __vite_glob_0_22,
	"../../../backend/app/userdata.py": __vite_glob_0_23
});

const HOST = Object.values([__vite_glob_1_0])[0];

const emb = proxy({
	phase: "idle",
	msg: "",
	pct: 0,
	catalogUrl: "",
	needCatalogUrl: false
});

let py = null;
let host = null;
let netGet$1 = async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer());

let netSize$1 = async (u) => {
	const l = (await fetch(u, { method: "HEAD" })).headers.get("content-length");

	return l ? Number(l) : null;
};

let booting = null;

function setNet(g, size) {
	netGet$1 = g;

	if (size) netSize$1 = size;
}

function readPrefs() {
	try {
		return JSON.parse(localStorage.getItem(LS) || "{}");
	} catch {
		return {};
	}
}

function savePrefs(patch) {
	try {
		localStorage.setItem(LS, JSON.stringify({ ...readPrefs(), ...patch }));
	} catch {}
}

function loadPrefs(defaultCatalog) {
	const s = readPrefs();
	const saved = typeof s.catalogUrl === "string" && !(/^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/).test(s.catalogUrl) ? s.catalogUrl : "";

	emb.catalogUrl = saved || defaultCatalog;
}

function saveCatalogUrl(u) {
	emb.catalogUrl = u.trim();
	savePrefs({ catalogUrl: emb.catalogUrl });
}

function syncFs(populate) {
	return new Promise((res, rej) => py.FS.syncfs(populate, (e) => e ? rej(e) : res()));
}

async function gunzip(data) {
	const ds = new DecompressionStream("gzip");
	const w = ds.writable.getWriter();

	w.write(data);
	w.close();

	return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function boot(defaultCatalog) {
	loadPrefs(defaultCatalog);

	if (!booting) {
		booting = run().catch((e) => {
			booting = null;
			emb.phase = "error";
			emb.msg = String(e?.message || e);

			throw e;
		});
	}

	return booting;
}

async function run() {
	emb.phase = "runtime";
	emb.pct = 0;
	emb.msg = "Backend wird vorbereitet (einmalig, braucht Internet) …";

	const mod = await import(/* @vite-ignore */
	PYODIDE + "pyodide.mjs");

	py = await mod.loadPyodide({ indexURL: PYODIDE });
	emb.pct = 25;
	await py.loadPackage(PKGS);
	emb.pct = 55;

	await py.runPythonAsync(`import micropip
await micropip.install(${JSON.stringify(PIP)})`);

	emb.pct = 80;
	py.FS.mkdirTree("/data");
	py.FS.mount(py.FS.filesystems.IDBFS, {}, "/data");
	await syncFs(true);

	if (py.FS.analyzePath("/data/anime.db").exists) py.FS.unlink("/data/anime.db");

	if (!py.FS.analyzePath("/data/catalog.db").exists) {
		if (!emb.catalogUrl) {
			emb.needCatalogUrl = true;

			throw new Error("Katalog-Quelle fehlt.");
		}

		emb.phase = "catalog";
		emb.pct = 0;
		emb.msg = "Katalog wird geladen (ca. 13 MB, einmalig) …";

		const gz = await netGet$1(emb.catalogUrl);

		emb.msg = "Katalog wird entpackt …";

		const db = await gunzip(gz);

		py.FS.writeFile("/data/catalog.db", db);
		await syncFs(false);
		savePrefs({ catalogSig: String(gz.length), checkedAt: Date.now() });
	}

	py.FS.mkdirTree("/work");
	py.FS.writeFile("/work/anime.db", py.FS.readFile("/data/catalog.db"));
	py.FS.mkdirTree("/app/app");

	for (const [path, code] of Object.entries(SOURCES)) {
		const rel = path.split("/backend/app/")[1];

		if (!rel) continue;

		const full = "/app/app/" + rel;

		py.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
		py.FS.writeFile(full, code);
	}

	py.FS.writeFile("/app/host.py", HOST);

	await py.runPythonAsync(`import sys
sys.path.insert(0, '/app')
import host`);

	host = py.pyimport("host");

	if (py.FS.analyzePath("/data/user.json").exists) {
		const txt = py.FS.readFile("/data/user.json", { encoding: "utf8" });

		await call("POST", "/import", {}, txt);
	}

	emb.phase = "ready";
	emb.msg = "";
	emb.pct = 100;
	checkCatalogUpdate(false).catch(() => {});
}

async function updateCatalog() {
	const keep = await call("GET", "/export/json", {}, "");

	emb.phase = "catalog";
	emb.pct = 0;
	emb.msg = "Katalog wird aktualisiert …";

	try {
		const gz = await netGet$1(emb.catalogUrl);

		emb.msg = "Katalog wird entpackt …";

		const db = await gunzip(gz);

		py.FS.writeFile("/data/catalog.db", db);
		py.FS.writeFile("/work/anime.db", db);

		if (keep.status === 200) await call("POST", "/import", {}, keep.body);

		await syncFs(false);
		savePrefs({ catalogSig: String(gz.length), checkedAt: Date.now() });
	} finally {
		emb.phase = "ready";
		emb.msg = "";
	}
}

async function checkCatalogUpdate(force) {
	if (!host || !emb.catalogUrl) return "unreachable";

	const p = readPrefs();

	if (!force && p.catalogSig && Date.now() - (p.checkedAt || 0) < 12 * 3600 * 1e3) return "skipped";

	let size = null;

	try {
		size = await netSize$1(emb.catalogUrl);
	} catch {}

	if (size == null) return p.catalogSig ? "unreachable" : await replaceUnknown();

	if (String(size) === p.catalogSig) {
		savePrefs({ checkedAt: Date.now() });

		return "current";
	}

	await updateCatalog();

	return "updated";
}

async function replaceUnknown() {
	await updateCatalog();

	return "updated";
}

async function call(method, url, headers, body) {
	return JSON.parse(await host.handle(method, url, JSON.stringify(headers), body));
}

let syncTimer = null;

function scheduleSync() {
	clearTimeout(syncTimer);

	syncTimer = setTimeout(
		async () => {
			try {
				const r = await call("GET", "/export/json", {}, "");

				if (r.status === 200) {
					py.FS.writeFile("/data/user.json", r.body);
					await syncFs(false);
				}
			} catch {}
		},
		1500
	);
}

let aiCtl = null;

function ai() {
	return aiCtl ??= createAi({
		host: {
			count: async () => JSON.parse(await host.ai_count()),
			docs: async (after, limit) => JSON.parse(await host.ai_docs(after, limit)),
			allowed: async (space, newForMe, filters, hPassword) => JSON.parse(await host.ai_allowed(space, newForMe, JSON.stringify(filters), hPassword)),
			fetch: async (ids, dist) => JSON.parse(await host.ai_fetch(JSON.stringify(ids), JSON.stringify(dist)))
		}
	});
}

const embeddedHttp = async (url, init) => {
	if (!host) throw new Error("Backend nicht bereit");

	const method = (init.method || "GET").toUpperCase();
	const isAi = (/^\/ai(\/|$)/).test(new URL(url, "http://local").pathname);

	const out = isAi
		? await ai().route(method, url, init.headers || {}, init.body || "")
		: await call(method, url, init.headers || {}, init.body || "");

	if (method !== "GET" && !isAi) scheduleSync();

	const res = {
		status: out.status,
		json: async () => JSON.parse(out.body),
		text: async () => out.body
	};

	return res;
};

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

var root$a = from_html(`<p class="hint svelte-wahwi9" style="margin-top:0"> </p>`);
var root_1$a = from_html(`<button><b> </b> <i class="svelte-wahwi9"> </i></button>`);
var root_2$a = from_html(`<input style="margin-top:12px" placeholder="Hugging-Face-Modellname, z. B. Xenova/multilingual-e5-small" autocapitalize="off" autocomplete="off" spellcheck="false" class="svelte-wahwi9"/> <div class="sugg svelte-wahwi9"></div> <p class="hint svelte-wahwi9"> </p> <button class="big svelte-wahwi9">Modell übernehmen</button>`, 1);
var root_3$8 = from_html(`<div class="seg svelte-wahwi9" style="margin-top:12px"><button>Ollama</button> <button>OpenAI-kompatibel</button></div> <input style="margin-top:10px" autocapitalize="off" spellcheck="false" class="svelte-wahwi9"/> <input autocapitalize="off" spellcheck="false" class="svelte-wahwi9"/> <input type="password" class="svelte-wahwi9"/> <button class="big svelte-wahwi9">Speichern</button> <p class="hint svelte-wahwi9">Android sperrt unverschlüsseltes HTTP: auf dem Handy braucht der Endpunkt <b>HTTPS</b> (z. B. über einen Reverse-Proxy im Heimnetz). Am Desktop geht auch <code>http://</code>, Ollama muss dann Anfragen dieser App erlauben (<code>OLLAMA_ORIGINS</code>). Der Schlüssel bleibt nur auf diesem Gerät. Zum Aufbau des Index gehen die Titeltexte an den eingetragenen Server.</p>`, 1);
var root_4$8 = from_html(`<div class="bar svelte-wahwi9" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="svelte-wahwi9"></div></div> <p class="hint svelte-wahwi9"> </p>`, 1);
var root_5$6 = from_html(`· <b> </b>`, 1);
var root_6$6 = from_html(`<div class="bar svelte-wahwi9" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="svelte-wahwi9"></div></div>`);
var root_7$6 = from_html(`<!> <p class="hint svelte-wahwi9"> </p> <button class="big alt svelte-wahwi9">Pausieren</button>`, 1);
var root_8$6 = from_html(`<button class="link svelte-wahwi9">Index komplett neu aufbauen</button> <button class="link svelte-wahwi9">Index dieses Modells löschen</button>`, 1);
var root_9$6 = from_html(`<button class="big svelte-wahwi9"> </button> <!>`, 1);
var root_10$6 = from_html(`<p class="msg svelte-wahwi9"> </p>`);
var root_11$6 = from_html(`<p class="hint svelte-wahwi9"> <!></p> <!> <!>`, 1);
var root_12$5 = from_html(`<div class="field last svelte-wahwi9"><div class="lab svelte-wahwi9">Wo läuft das Embedding-Modell?</div> <div class="opts svelte-wahwi9"><label class="opt svelte-wahwi9"><input type="radio" name="aimode" class="svelte-wahwi9"/> <span><b>Auf diesem Gerät</b> — Modell einmal von Hugging Face laden, danach läuft die Suche selbst</span></label> <label class="opt svelte-wahwi9"><input type="radio" name="aimode" class="svelte-wahwi9"/> <span><b>Externes Modell</b> — z. B. Ollama im Heimnetz</span></label></div> <!> <button class="big alt svelte-wahwi9"> </button> <!> <!> <p class="hint svelte-wahwi9">Jedes Modell hat seinen eigenen Index; beim Wechsel bleibt der alte gespeichert, bis du ihn löschst. Der Aufbau läuft im Hintergrund, solange die App offen ist, und macht beim nächsten Start dort weiter, wo er war. Die Suche funktioniert schon mit einem Teil-Index. Auf dem Handy kann der Aufbau je nach Modell lange dauern.</p></div>`);
var root_13$5 = from_html(`<div class="field svelte-wahwi9"><div class="lab svelte-wahwi9">KI-Funktionen</div> <div class="seg svelte-wahwi9"><button>Aktiv</button> <button>Aus</button></div> <p class="hint svelte-wahwi9">Schaltet die semantische Suche („KI"-Knopf in Entdecken und Meine Liste) ein. Du suchst damit nach Handlung und Thema statt nach Titeln, zusammen mit allen Filtern. Alles läuft in dieser App; Netz brauchen der Modell-Download, das Laden der Laufzeit (jsDelivr) und ein evtl. externes Modell.</p></div> <!> <!>`, 1);

const $$css$a = {
	hash: 'svelte-wahwi9',
	code: '.field.svelte-wahwi9 {margin-bottom:24px;}.field.last.svelte-wahwi9 {margin-bottom:0;}.field.svelte-wahwi9 > .lab:where(.svelte-wahwi9) {display:block;font-size:0.78rem;font-weight:500;letter-spacing:0.02em;color:var(--text-muted);margin-bottom:10px;}.seg.svelte-wahwi9 {display:inline-flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}.seg.svelte-wahwi9 button:where(.svelte-wahwi9) {padding:8px 18px;border:0;background:var(--surface);color:var(--text-muted);cursor:pointer;font-size:0.85rem;}.seg.svelte-wahwi9 button:where(.svelte-wahwi9) + button:where(.svelte-wahwi9) {border-left:1px solid var(--border);}.seg.svelte-wahwi9 button.on:where(.svelte-wahwi9) {background:var(--accent);color:#fff;font-weight:600;}.opts.svelte-wahwi9 {display:flex;flex-direction:column;gap:8px;}.opt.svelte-wahwi9 {display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:0.84rem;color:var(--text);margin:0;}.opt.svelte-wahwi9 input:where(.svelte-wahwi9) {width:auto;margin:3px 0 0;}input.svelte-wahwi9:not([type=\'radio\']) {display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:0.88rem;}.big.svelte-wahwi9 {display:block;width:100%;margin-top:12px;padding:11px 14px;border:0;border-radius:var(--radius);background:var(--accent);color:#fff;font-weight:600;font-size:0.88rem;cursor:pointer;}.big.alt.svelte-wahwi9 {background:var(--surface-2);color:var(--text);}.big.svelte-wahwi9:disabled {opacity:0.45;cursor:default;}.hint.svelte-wahwi9 {font-size:0.8rem;color:var(--text-muted);line-height:1.6;margin:10px 0 0;}.msg.svelte-wahwi9 {color:var(--accent);font-size:0.82rem;margin-top:8px;}.link.svelte-wahwi9 {background:none;border:0;color:var(--text-muted);font-size:0.78rem;cursor:pointer;margin-top:10px;text-decoration:underline;padding:0;}.sugg.svelte-wahwi9 {display:flex;flex-direction:column;gap:6px;margin-top:10px;}.chip.svelte-wahwi9 {text-align:left;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:0.8rem;cursor:pointer;}.chip.on.svelte-wahwi9 {border-color:var(--accent);}.chip.svelte-wahwi9 i:where(.svelte-wahwi9) {display:block;color:var(--text-muted);font-style:normal;font-size:0.75rem;margin-top:2px;}.bar.svelte-wahwi9 {height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin-top:14px;}.bar.svelte-wahwi9 > div:where(.svelte-wahwi9) {height:100%;background:var(--accent);transition:width 0.3s;}'
};

function Ai_EmbeddedSettings($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$a);

	// KI-Einstellungen im eingebetteten Backend: Modell auf dem Geraet (Hugging Face) oder externer Endpunkt im Heimnetz.
	let ai = state(null);

	let st = state(null);
	let msg = state('');
	let busy = state(false);
	let key = state('');
	let hf = state('');
	let timer = null;

	async function reload() {
		try {
			set(ai, await api.aiConfig(), true);
			set(st, await api.aiStatus(), true);

			if (!get(hf)) set(hf, get(ai).hf_model || '', true);
		} catch {
			set(msg, 'KI-Konfiguration nicht erreichbar.');
		}
	}

	async function poll() {
		try {
			set(st, await api.aiStatus(), true);
		} catch {}
	}

	onMount(() => {
		reload();
		timer = setInterval(poll, 700);
	});

	onDestroy(() => clearInterval(timer));

	async function save(patch) {
		set(msg, '');

		try {
			set(ai, await api.aiConfigSet(patch), true);
			await poll();
			await refreshAi();
		} catch {
			set(msg, 'Speichern fehlgeschlagen.');
		}
	}

	async function saveDevice() {
		if (!get(hf).trim()) {
			set(msg, 'Bitte einen Modellnamen eintragen.');

			return;
		}

		await save({ mode: 'device', hf_model: get(hf).trim() });
		set(msg, `Modell „${get(hf).trim()}“ gespeichert. Mit „Modell laden & Index aufbauen“ geht es los.`);
	}

	async function saveExternal() {
		const p = {
			mode: 'external',
			ext_kind: get(ai).ext_kind,
			ext_url: get(ai).ext_url,
			ext_model: get(ai).ext_model
		};

		if (get(key)) p.ext_key = get(key);

		await save(p);
		set(key, '');
	}

	async function test() {
		set(busy, true);
		set(msg, '');

		const r = await api.aiTest().catch(() => ({ ok: false, error: 'nicht erreichbar' }));

		set(
			msg,
			r.ok
				? `Modell läuft — liefert ${r.dim} Dimensionen.`
				: `Fehlgeschlagen: ${r.error}`,
			true
		);

		set(busy, false);
		await poll();
	}

	async function start(rebuild) {
		set(msg, '');

		if (rebuild && !confirm('Den Index dieses Modells komplett neu aufbauen? Das kann lange dauern.')) return;

		const r = await api.aiIndex(rebuild).catch(() => null);

		if (!r) set(msg, 'Index konnte nicht gestartet werden.');

		await poll();
		await reload();
		await refreshAi();
	}

	async function pause() {
		await request('/ai/stop', { method: 'POST' });
		set(msg, 'Pausiert …');
	}

	async function wipe() {
		if (!confirm('Den Index dieses Modells löschen?')) return;

		const r = await request('/ai/index', { method: 'DELETE' });

		set(
			msg,
			r.status === 200
				? 'Index dieses Modells gelöscht.'
				: (await r.json().catch(() => ({}))).detail || 'Löschen fehlgeschlagen.',
			true
		);

		await reload();
	}

	let running = user_derived(() => !!get(st)?.indexing?.running);
	let loading = user_derived(() => get(st)?.local?.phase === 'loading');
	let pct = user_derived(() => Math.max(0, Math.min(100, get(st)?.local?.pct ?? 0)));
	let hasIndex = user_derived(() => (get(st)?.embedded ?? 0) > 0);
	let rec = user_derived(() => get(ai)?.recommended);
	var fragment = comment();
	var node = first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p_1 = root$a();
			var text = only_child(p_1, true);

			template_effect(() => set_text(text, get(msg) || 'Lade …'));
			append($$anchor, p_1);
		};

		var alternate_2 = ($$anchor) => {
			var fragment_1 = root_13$5();
			var div = first_child(fragment_1);
			var div_1 = sibling(child(div), 2);
			var button = child(div_1);
			let classes;
			var button_1 = sibling(button, 2);
			let classes_1;

			var node_1 = sibling(div, 2);

			{
				var consequent_9 = ($$anchor) => {
					var div_2 = root_12$5();
					var div_3 = sibling(child(div_2), 2);
					var label = child(div_3);
					var input = child(label);

					var label_1 = sibling(label, 2);
					var input_1 = child(label_1);

					var node_2 = sibling(div_3, 2);

					{
						var consequent_1 = ($$anchor) => {
							var fragment_2 = root_2$a();
							var input_2 = first_child(fragment_2);

							var div_4 = sibling(input_2, 2);

							each(div_4, 21, () => SUGGESTIONS, index, ($$anchor, s) => {
								var button_2 = root_1$a();
								let classes_2;
								var b = child(button_2);
								var text_1 = only_child(b, true);
								var text_2 = sibling(b);
								var i = sibling(text_2);
								var text_3 = only_child(i, true);

								template_effect(
									($0, $1) => {
										classes_2 = set_class(button_2, 1, 'chip svelte-wahwi9', null, classes_2, { on: $0 });
										button_2.disabled = get(running);
										set_text(text_1, get(s).tier);
										set_text(text_2, ` · ${$1 ?? ''} · ca. ${get(s).mb ?? ''} MB${get(rec)?.name === get(s).name ? ' · empfohlen' : ''} `);
										set_text(text_3, get(s).note);
									},
									[
										() => get(hf).trim() === get(s).name,
										() => get(s).name.split('/')[1]
									]
								);

								delegated('click', button_2, () => set(hf, get(s).name, true));
								append($$anchor, button_2);
							});

							var p_2 = sibling(div_4, 2);
							var text_4 = only_child(p_2);
							var button_3 = sibling(p_2, 2);

							template_effect(() => {
								input_2.disabled = get(running);
								set_text(text_4, `${get(rec)?.why ?? ''} Das sind Richtwerte — ob ein Modell auf deinem Gerät flüssig läuft, zeigt erst der Versuch. Es geht jedes Hugging-Face-Modell mit ONNX-Dateien (meist von „Xenova“ oder „onnx-community“). Das Modell wird einmalig geladen und danach aus dem Browser-Speicher verwendet.`);
								button_3.disabled = get(running);
							});

							bind_value(input_2, () => get(hf), ($$value) => set(hf, $$value));
							delegated('click', button_3, saveDevice);
							append($$anchor, fragment_2);
						};

						var alternate = ($$anchor) => {
							var fragment_3 = root_3$8();
							var div_5 = first_child(fragment_3);
							var button_4 = child(div_5);
							let classes_3;
							var button_5 = sibling(button_4, 2);
							let classes_4;

							var input_3 = sibling(div_5, 2);

							var input_4 = sibling(input_3, 2);

							var input_5 = sibling(input_4, 2);

							var button_6 = sibling(input_5, 2);

							template_effect(() => {
								classes_3 = set_class(button_4, 1, 'svelte-wahwi9', null, classes_3, { on: get(ai).ext_kind === 'ollama' });
								classes_4 = set_class(button_5, 1, 'svelte-wahwi9', null, classes_4, { on: get(ai).ext_kind === 'openai' });

								set_attribute(input_3, 'placeholder', get(ai).ext_kind === 'ollama'
									? 'Adresse, z. B. https://ollama.heimnetz.example'
									: 'Adresse, z. B. https://api.anbieter.de');

								input_3.disabled = get(running);

								set_attribute(input_4, 'placeholder', get(ai).ext_kind === 'ollama'
									? 'Modellname, z. B. bge-m3'
									: 'Modellname, z. B. text-embedding-3-small');

								input_4.disabled = get(running);

								set_attribute(input_5, 'placeholder', get(ai).ext_key_set
									? 'API-Schlüssel gespeichert (zum Ändern neu eingeben)'
									: 'API-Schlüssel (optional)');

								input_5.disabled = get(running);
								button_6.disabled = get(running);
							});

							delegated('click', button_4, () => get(ai).ext_kind = 'ollama');
							delegated('click', button_5, () => get(ai).ext_kind = 'openai');
							bind_value(input_3, () => get(ai).ext_url, ($$value) => get(ai).ext_url = $$value);
							bind_value(input_4, () => get(ai).ext_model, ($$value) => get(ai).ext_model = $$value);
							bind_value(input_5, () => get(key), ($$value) => set(key, $$value));
							delegated('click', button_6, saveExternal);
							append($$anchor, fragment_3);
						};

						if_block(node_2, ($$render) => {
							if (get(ai).mode === 'device') $$render(consequent_1); else $$render(alternate, -1);
						});
					}

					var button_7 = sibling(node_2, 2);
					var text_5 = only_child(button_7, true);
					var node_3 = sibling(button_7, 2);

					{
						var consequent_2 = ($$anchor) => {
							var fragment_4 = root_4$8();
							var div_6 = first_child(fragment_4);
							var div_7 = only_child(div_6);
							var p_3 = sibling(div_6, 2);
							var text_6 = only_child(p_3, true);

							template_effect(() => {
								set_attribute(div_6, 'aria-valuenow', get(pct));
								set_style(div_7, `width:${get(pct) ?? ''}%`);
								set_text(text_6, get(st).local.msg);
							});

							append($$anchor, fragment_4);
						};

						if_block(node_3, ($$render) => {
							if (get(loading)) $$render(consequent_2);
						});
					}

					var node_4 = sibling(node_3, 2);

					{
						var consequent_8 = ($$anchor) => {
							var fragment_5 = root_11$6();
							var p_4 = first_child(fragment_5);
							var text_7 = child(p_4);
							var node_5 = sibling(text_7);

							{
								var consequent_3 = ($$anchor) => {
									var fragment_6 = root_5$6();
									var b_1 = sibling(first_child(fragment_6));
									var text_8 = only_child(b_1, true);

									template_effect(() => set_text(text_8, get(st).problem));
									append($$anchor, fragment_6);
								};

								if_block(node_5, ($$render) => {
									if (get(st).problem && !get(running)) $$render(consequent_3);
								});
							}

							var node_6 = sibling(p_4, 2);

							{
								var consequent_5 = ($$anchor) => {
									var fragment_7 = root_7$6();
									var node_7 = first_child(fragment_7);

									{
										var consequent_4 = ($$anchor) => {
											var div_8 = root_6$6();
											var div_9 = only_child(div_8);

											template_effect(() => {
												set_attribute(div_8, 'aria-valuenow', get(pct));
												set_style(div_9, `width:${get(pct) ?? ''}%`);
											});

											append($$anchor, div_8);
										};

										if_block(node_7, ($$render) => {
											if (!get(loading)) $$render(consequent_4);
										});
									}

									var p_5 = sibling(node_7, 2);
									var text_9 = only_child(p_5, true);
									var button_8 = sibling(p_5, 2);

									template_effect(() => set_text(text_9, get(loading)
										? 'Danach wird der Index aufgebaut.'
										: `Index wird aufgebaut: ${get(st).indexing.done} / ${get(st).indexing.total} (${get(pct)} %)${get(st).local?.eta ? ' · ' + get(st).local.eta : ''}`));

									delegated('click', button_8, pause);
									append($$anchor, fragment_7);
								};

								var alternate_1 = ($$anchor) => {
									var fragment_8 = root_9$6();
									var button_9 = first_child(fragment_8);
									var text_10 = only_child(button_9, true);
									var node_8 = sibling(button_9, 2);

									{
										var consequent_6 = ($$anchor) => {
											var fragment_9 = root_8$6();
											var button_10 = first_child(fragment_9);
											var button_11 = sibling(button_10, 2);

											delegated('click', button_10, () => start(true));
											delegated('click', button_11, wipe);
											append($$anchor, fragment_9);
										};

										if_block(node_8, ($$render) => {
											if (get(hasIndex)) $$render(consequent_6);
										});
									}

									template_effect(() => set_text(text_10, get(hasIndex)
										? 'Index fortsetzen / neue Titel'
										: 'Modell laden & Index aufbauen'));

									delegated('click', button_9, () => start(false));
									append($$anchor, fragment_8);
								};

								if_block(node_6, ($$render) => {
									if (get(running) || get(st).local?.phase === 'indexing') $$render(consequent_5); else $$render(alternate_1, -1);
								});
							}

							var node_9 = sibling(node_6, 2);

							{
								var consequent_7 = ($$anchor) => {
									var p_6 = root_10$6();
									var text_11 = only_child(p_6);

									template_effect(() => set_text(text_11, `Fehler: ${get(st).indexing.error ?? ''}`));
									append($$anchor, p_6);
								};

								if_block(node_9, ($$render) => {
									if (get(st).indexing?.error) $$render(consequent_7);
								});
							}

							template_effect(() => set_text(text_7, `Index: ${get(st).embedded ?? ''} von ${get(st).media ?? ''} Titeln`));
							append($$anchor, fragment_5);
						};

						if_block(node_4, ($$render) => {
							if (get(st)) $$render(consequent_8);
						});
					}

					template_effect(() => {
						set_checked(input, get(ai).mode === 'device');
						input.disabled = get(running);
						set_checked(input_1, get(ai).mode === 'external');
						input_1.disabled = get(running);
						button_7.disabled = get(busy) || get(running);
						set_text(text_5, get(ai).mode === 'device' ? 'Modell laden & testen' : 'Verbindung testen');
					});

					delegated('change', input, () => save({ mode: 'device' }));
					delegated('change', input_1, () => save({ mode: 'external' }));
					delegated('click', button_7, test);
					append($$anchor, div_2);
				};

				if_block(node_1, ($$render) => {
					if (get(ai).enabled) $$render(consequent_9);
				});
			}

			var node_10 = sibling(node_1, 2);

			{
				var consequent_10 = ($$anchor) => {
					var p_7 = root_10$6();
					var text_12 = only_child(p_7, true);

					template_effect(() => set_text(text_12, get(msg)));
					append($$anchor, p_7);
				};

				if_block(node_10, ($$render) => {
					if (get(msg)) $$render(consequent_10);
				});
			}

			template_effect(() => {
				classes = set_class(button, 1, 'svelte-wahwi9', null, classes, { on: get(ai).enabled });
				classes_1 = set_class(button_1, 1, 'svelte-wahwi9', null, classes_1, { on: !get(ai).enabled });
			});

			delegated('click', button, () => save({ enabled: true }));
			delegated('click', button_1, () => save({ enabled: false }));
			append($$anchor, fragment_1);
		};

		if_block(node, ($$render) => {
			if (!get(ai)) $$render(consequent); else $$render(alternate_2, -1);
		});
	}

	append($$anchor, fragment);
	pop();
}

delegate(['click', 'change']);

var root$9 = from_html(`<button> </button>`);
var root_1$9 = from_html(`<button></button>`);
var root_2$9 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Erscheinungsbild</label> <div class="seg svelte-lqmuci"><button>Dunkel</button> <button>Hell</button></div></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Profilfarbe</label> <div class="swatches svelte-lqmuci"></div> <p class="hint svelte-lqmuci">Wie bei AniList — färbt die ganze App. Standard: Rot.</p></div></section>`);
var root_3$7 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Medientypen</label> <button class="big svelte-lqmuci">Medientypen verwalten / Config wählen →</button> <p class="hint svelte-lqmuci">Jede Config ist eigenständig (eigene Genres und Dienste). Anzeige auf Deutsch; Titel in allen Varianten durchsuchbar.</p></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Deutscher Dub — Konfidenz</label> <div class="seg svelte-lqmuci"><button class="on svelte-lqmuci">high</button><button class="svelte-lqmuci">normal</button><button class="svelte-lqmuci">low</button></div> <p class="hint svelte-lqmuci"> </p></div></section>`);
var root_4$7 = from_html(`<div class="svc-row svelte-lqmuci"><span class="svelte-lqmuci"> </span><code class="svelte-lqmuci"> <!></code><button class="del svelte-lqmuci" aria-label="Entfernen">✕</button></div>`);
var root_5$5 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci"> </label> <!> <div class="addsvc svelte-lqmuci"><input placeholder="Name (z. B. Wakanim)" class="svelte-lqmuci"/> <input class="svelte-lqmuci"/> <input class="svelte-lqmuci"/> <button class="big svelte-lqmuci">+ Dienst hinzufügen</button></div> <p class="hint svelte-lqmuci"><code class="svelte-lqmuci"></code> = Titel als URL-Kurzform (<code class="svelte-lqmuci">Scum's Wish</code> → <code class="svelte-lqmuci">scums-wish</code>), <code class="svelte-lqmuci"></code> = Titel für eine Suche. Mit Direktlink + Suche öffnet die App erst die Serienseite und fällt bei „nicht gefunden“ auf die Suche zurück (die Prüfung geht nur auf dem Handy; im Browser öffnet immer der Direktlink). Nur ein Schema mit <code class="svelte-lqmuci"></code> funktioniert wie eine reine Suche.</p></div></section>`);
var root_6$5 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0"> </p>`);
var root_7$5 = from_html(`<input type="password" class="svelte-lqmuci"/>`);
var root_8$5 = from_html(`<div class="seg svelte-lqmuci" style="margin-top:12px"><button>OpenAI-kompatibel</button> <button>Ollama</button></div> <input style="margin-top:10px" class="svelte-lqmuci"/> <input placeholder="Modellname, z. B. text-embedding-3-small" class="svelte-lqmuci"/> <!> <button class="big svelte-lqmuci">Speichern</button> <p class="hint svelte-lqmuci">Der Schlüssel liegt nur in der lokalen Datenbank dieses Backends und wird nie zurück an die Oberfläche gesendet. Bei einem Anbieter gehen die Titel-Texte zum Aufbau des Index an dessen Server.</p>`, 1);
var root_9$5 = from_html(`<p class="hint svelte-lqmuci"> <b> </b><!></p> <button class="big svelte-lqmuci"> </button> <button class="link svelte-lqmuci">Index komplett neu aufbauen</button>`, 1);
var root_10$5 = from_html(`<div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Wo läuft das Embedding-Modell?</label> <div class="opts svelte-lqmuci"><label class="opt dis svelte-lqmuci"><input type="radio" disabled="" class="svelte-lqmuci"/> <span><b>Auf diesem Gerät</b> (Handy) — ein kleines Modell wird geladen<br/><i class="svelte-lqmuci">Kommt mit der Handy-Version, noch nicht verfügbar.</i></span></label> <label class="opt svelte-lqmuci"><input type="radio" name="aimode" class="svelte-lqmuci"/> <span><b>Server-Modell</b> — Ollama auf dem Backend-Rechner (bge-m3)</span></label> <label class="opt svelte-lqmuci"><input type="radio" name="aimode" class="svelte-lqmuci"/> <span><b>Externes Modell</b> — eigener Endpunkt oder Anbieter</span></label></div> <!> <button class="big svelte-lqmuci" style="background:var(--surface-2);color:var(--text)">Verbindung testen</button> <!> <p class="hint svelte-lqmuci">Wechselst du das Modell, muss der Index neu aufgebaut werden, weil Vektoren verschiedener Modelle nicht zusammenpassen. Das dauert je nach Modell Minuten bis Stunden.</p></div>`);
var root_11$5 = from_html(`<p class="msg svelte-lqmuci"> </p>`);
var root_12$4 = from_html(`<div class="field svelte-lqmuci"><label class="svelte-lqmuci">KI-Funktionen</label> <div class="seg svelte-lqmuci"><button>Aktiv</button> <button>Aus</button></div> <p class="hint svelte-lqmuci">Schaltet die semantische Suche („KI"-Knopf in Entdecken und Meine Liste) ein. Du suchst damit nach Handlung und Thema statt nach Titeln, zusammen mit allen Filtern.</p></div> <!> <!>`, 1);
var root_13$4 = from_html(`<section class="card svelte-lqmuci"><!></section>`);
var root_14$3 = from_html(`<p class="hint svelte-lqmuci"> </p>`);
var root_15$3 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Zu AniList hochsynchronisieren</label> <p class="hint svelte-lqmuci" style="margin-top:0">Überträgt Status, Wertung und Fortschritt deiner Anime-Liste (nie H). Ohne hinterlegten AniList-Token wird nichts gesendet — die Vorschau zeigt, was übertragen würde.</p> <button class="big svelte-lqmuci">Vorschau laden</button> <!> <button class="big svelte-lqmuci">Jetzt synchronisieren</button> <!></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Daten von AniList importieren</label> <p class="hint svelte-lqmuci" style="margin-top:0">Liest dein <b>öffentliches</b> AniList-Profil (kein Token nötig) und ergänzt Tags, Studios, Saison, Land, Quelle, Start-/Enddatum, Rewatches und Favoriten. Status, Wertung und Fortschritt bleiben unverändert.</p> <input placeholder="AniList-Benutzername" class="svelte-lqmuci"/> <button class="big svelte-lqmuci"> </button> <!></div></section>`);
var root_16$2 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Export / Backup</label> <button class="big svelte-lqmuci">Als MAL-XML exportieren (Standard)</button> <button class="big svelte-lqmuci">Als JSON-Vollbackup exportieren</button> <input type="file" accept=".json,.xml" style="display:none" class="svelte-lqmuci"/> <button class="big svelte-lqmuci">Liste importieren (Orbitlist-JSON oder MAL-XML)</button> <!> <p class="hint svelte-lqmuci">MAL-XML importieren AniList/Kitsu/Simkl/MAL. JSON enthält zusätzlich Notizen, Regal &amp; Favoriten.</p></div></section>`);
var root_17$2 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">API: <code class="svelte-lqmuci"> </code></p> <p class="hint svelte-lqmuci">Pair-Token: <code class="svelte-lqmuci"> </code></p> <p class="hint svelte-lqmuci"> </p>`, 1);
var root_18$2 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">Pairing-Info nicht erreichbar.</p>`);
var root_19$1 = from_html(`<p class="hint svelte-lqmuci" style="margin-top:0">Lade …</p>`);
var root_20$1 = from_html(`<section class="card svelte-lqmuci"><div class="field svelte-lqmuci"><label class="svelte-lqmuci">Verbindung (Developer)</label> <!></div> <div class="field last svelte-lqmuci"><label class="svelte-lqmuci">MCP-Server <code class="svelte-lqmuci">fuchs-orbitlist</code></label> <p class="hint svelte-lqmuci" style="margin-top:0">Für KI-Assistenten (Lesen &amp; Schreiben, inkl. KI-Suche mit Filtern). Start über <code class="svelte-lqmuci">backend/mcp_server.py</code>; Einbindung in die MCP-Config des Assistenten (siehe README).</p></div></section>`);
var root_21$1 = from_html(`<button class="link svelte-lqmuci">Passwort vergessen? Zurücksetzen</button>`);
var root_22$1 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Privater Bereich (H)</label> <p class="hint svelte-lqmuci"> </p> <input type="password" class="svelte-lqmuci"/> <button class="big svelte-lqmuci"> </button> <!> <!></div></section>`);
var root_23$1 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Backend</label> <p class="hint svelte-lqmuci">Eingebaut: läuft in diesem Plugin auf dem Gerät, ohne Server. Deine Liste liegt nur auf diesem Gerät. Mehrere Geräte/Frontends: Plugin „Orbit-List Connect" mit einem eigenen Backend verbinden.</p> <button class="big svelte-lqmuci">Katalog auf neue Version prüfen</button> <!></div></section>`);
var root_24$1 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Verbindung</label> <p class="hint svelte-lqmuci"> </p> <button class="big svelte-lqmuci"> </button></div></section>`);
var root_25$1 = from_html(`<section class="card svelte-lqmuci"><div class="field last svelte-lqmuci"><label class="svelte-lqmuci">Über</label> <p class="hint svelte-lqmuci">Orbitlist — erweiterbarer Medien-Tracker.<br/> Katalog: <a href="https://github.com/Entwicklerfuchs26/AnimeDB" target="_blank" rel="noopener">AnimeDB</a> (Wikidata CC0, Wikipedia CC BY-SA, anime-offline-database ODbL; Daten ODbL 1.0). Dub data © MyDubList – mydublist.com (CC BY 4.0). Bilder, Charaktere, Statistiken und Streaming-Verfügbarkeit: AniList (Abruf auf deinem Gerät).<br/> </p></div></section> <!>`, 1);
var root_26$1 = from_html(`<div class="scrim svelte-lqmuci" role="presentation"></div> <aside class="panel svelte-lqmuci"><header class="svelte-lqmuci"><h2 class="svelte-lqmuci">Einstellungen</h2> <button class="close svelte-lqmuci" aria-label="Schließen">✕</button></header> <nav class="svelte-lqmuci"></nav> <div class="body svelte-lqmuci"><!></div></aside>`, 1);

const $$css$9 = {
	hash: 'svelte-lqmuci',
	code: '.scrim.svelte-lqmuci {position:fixed;inset:0;background:rgba(0, 0, 0, 0.45);z-index:50;}.panel.svelte-lqmuci {position:fixed;top:0;right:0;z-index:51;width:min(480px, 100%);height:100%;overflow-y:auto;background:var(--bg);box-shadow:var(--shadow);}header.svelte-lqmuci {display:flex;justify-content:space-between;align-items:center;padding:20px var(--pad) 16px;}\n  @media (max-width: 560px) {header.svelte-lqmuci, nav.svelte-lqmuci, .body.svelte-lqmuci {padding-left:20px;padding-right:20px;} }header.svelte-lqmuci h2:where(.svelte-lqmuci) {margin:0;font-size:1.15rem;font-weight:500;color:var(--text-strong);}.close.svelte-lqmuci {width:30px;height:30px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.9rem;line-height:1;transition:background 0.15s, color 0.15s;}.close.svelte-lqmuci:hover {background:var(--surface-2);color:var(--text);}nav.svelte-lqmuci {display:flex;gap:4px;padding:0 var(--pad);overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;border-bottom:1px solid var(--border);}nav.svelte-lqmuci button:where(.svelte-lqmuci) {padding:10px 14px;white-space:nowrap;flex:0 0 auto;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.85rem;font-weight:500;margin-bottom:-1px;transition:color 0.15s, border-color 0.15s;}nav.svelte-lqmuci button:where(.svelte-lqmuci):hover {color:var(--text);}nav.svelte-lqmuci button.on:where(.svelte-lqmuci) {color:var(--text-strong);border-bottom-color:var(--accent);}.body.svelte-lqmuci {padding:24px var(--pad) 40px;}.card.svelte-lqmuci {background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:22px 24px;margin-bottom:16px;}.field.svelte-lqmuci {margin-bottom:24px;}.field.last.svelte-lqmuci {margin-bottom:0;}.field.svelte-lqmuci > label:where(.svelte-lqmuci) {display:block;font-size:0.78rem;font-weight:500;letter-spacing:0.02em;color:var(--text-muted);margin-bottom:10px;}.seg.svelte-lqmuci {display:inline-flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}.seg.svelte-lqmuci button:where(.svelte-lqmuci) {padding:8px 18px;border:0;background:var(--surface);color:var(--text-muted);cursor:pointer;font-size:0.85rem;transition:background 0.15s, color 0.15s;}.seg.svelte-lqmuci button:where(.svelte-lqmuci):hover {color:var(--text);}.seg.svelte-lqmuci button:where(.svelte-lqmuci) + button:where(.svelte-lqmuci) {border-left:1px solid var(--border);}.seg.svelte-lqmuci button.on:where(.svelte-lqmuci) {background:var(--accent);color:#fff;font-weight:600;}.swatches.svelte-lqmuci {display:flex;flex-wrap:wrap;gap:10px;}.swatch.svelte-lqmuci {width:30px;height:30px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;transition:transform 0.1s;}.swatch.svelte-lqmuci:hover {transform:scale(1.1);}.swatch.on.svelte-lqmuci {border-color:var(--text-strong);box-shadow:0 0 0 2px var(--surface) inset;}.big.svelte-lqmuci {width:100%;padding:11px 14px;border-radius:var(--radius);border:0;background:var(--accent);color:#fff;cursor:pointer;font-size:0.88rem;font-weight:500;margin-top:4px;transition:background 0.15s, opacity 0.15s;}.big.svelte-lqmuci:hover {background:var(--accent-dim);}.big.svelte-lqmuci:disabled {opacity:0.45;cursor:default;background:var(--accent);}input.svelte-lqmuci {width:100%;padding:10px 12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:8px;font-size:0.88rem;transition:border-color 0.15s;}input.svelte-lqmuci:focus {outline:none;border-color:var(--accent);}input.svelte-lqmuci::placeholder {color:var(--text-muted);}.opts.svelte-lqmuci {display:flex;flex-direction:column;gap:6px;}.opt.svelte-lqmuci {display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:0.84rem;color:var(--text);margin:0;letter-spacing:0;}.opt.svelte-lqmuci input:where(.svelte-lqmuci) {width:auto;margin:3px 0 0;}.opt.dis.svelte-lqmuci {opacity:0.55;cursor:default;}.opt.svelte-lqmuci i:where(.svelte-lqmuci) {color:var(--text-muted);font-size:0.78rem;}.hint.svelte-lqmuci {font-size:0.8rem;color:var(--text-muted);line-height:1.6;margin:10px 0 0;}.msg.svelte-lqmuci {color:var(--accent);font-size:0.82rem;margin-top:8px;}.link.svelte-lqmuci {background:none;border:0;color:var(--text-muted);font-size:0.78rem;cursor:pointer;margin-top:10px;text-decoration:underline;padding:0;}.link.svelte-lqmuci:hover {color:var(--text);}.svc-row.svelte-lqmuci {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;}.svc-row.svelte-lqmuci span:where(.svelte-lqmuci) {color:var(--text-strong);font-weight:500;}.svc-row.svelte-lqmuci .del:where(.svelte-lqmuci) {flex:0 0 auto;width:24px;height:24px;border-radius:var(--radius);border:0;background:transparent;color:var(--bad);cursor:pointer;transition:background 0.15s;}.svc-row.svelte-lqmuci .del:where(.svelte-lqmuci):hover {background:var(--surface-2);}.svc-row.svelte-lqmuci code:where(.svelte-lqmuci) {color:var(--text-muted);font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%;}.addsvc.svelte-lqmuci {display:flex;flex-direction:column;gap:8px;margin-top:14px;}code.svelte-lqmuci {background:var(--surface-2);padding:1px 5px;border-radius:var(--radius-sm);font-size:0.85em;}'
};

function Settings($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$9);

	let catMsg = state('');

	async function checkCat() {
		set(catMsg, 'Prüfe …');

		try {
			const r = await checkCatalogUpdate(true);

			set(
				catMsg,
				r === 'current'
					? 'Der Katalog ist aktuell.'
					: r === 'updated'
						? 'Katalog aktualisiert.'
						: 'Katalog-Quelle nicht erreichbar.',
				true
			);
		} catch(e) {
			set(catMsg, e?.message || String(e), true);
		}
	}

	let importEl = state(void 0);
	let importMsg = state('');

	async function doImport(e) {
		const f = e.target.files?.[0];

		if (!f) return;

		set(importMsg, 'Importiere …');

		try {
			const r = await importUserData(f);

			set(importMsg, `${r.matched} Einträge übernommen${r.not_in_catalog
				? `, ${r.not_in_catalog} nicht im Katalog gefunden`
				: ''}. Seite wird neu geladen …`);

			setTimeout(
				() => {
					conn.rev++;
				},
				900
			);
		} catch(err) {
			set(importMsg, err.message || String(err), true);
		}

		e.target.value = '';
	}

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
	let newSearch = state('');

	async function addSvc() {
		if (!get(newName).trim() || !get(newUrl).trim()) return;

		const search = get(newSearch).trim() || null;

		const r = await api.addService({
			name: get(newName),
			url_schema: get(newUrl).trim(),
			search_schema: search,
			config: activeConfig()
		});

		set(
			svcs,
			[
				...get(svcs),
				{
					id: r.id,
					name: get(newName),
					url_schema: get(newUrl).trim(),
					search_schema: search
				}
			],
			true
		);

		set(newName, '');
		set(newUrl, '');
		set(newSearch, '');
	}

	async function delSvc(id) {
		try {
			await api.deleteService(id);
		} catch {}

		set(svcs, get(svcs).filter((s) => s.id !== id), true);
	}

	var fragment = root_26$1();
	var div = first_child(fragment);
	var aside = sibling(div, 2);
	var header = child(aside);
	var button = sibling(child(header), 2);

	var nav = sibling(header, 2);

	each(nav, 21, () => CATS, index, ($$anchor, $$item) => {
		var $$array = user_derived(() => to_array(get($$item), 2));
		let id = () => get($$array)[0];
		let label = () => get($$array)[1];
		var button_1 = root$9();
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
			var section = root_2$9();
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
				var button_4 = root_1$9();
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

		var consequent_3 = ($$anchor) => {
			var section_2 = root_5$5();
			var div_8 = child(section_2);
			var label_1 = child(div_8);
			var text_2 = only_child(label_1);
			var node_1 = sibling(label_1, 2);

			each(node_1, 17, () => get(svcs), index, ($$anchor, s) => {
				var div_9 = root_4$7();
				var span = child(div_9);
				var text_3 = only_child(span, true);
				var code = sibling(span);
				var text_4 = child(code);
				var node_2 = sibling(text_4);

				{
					var consequent_2 = ($$anchor) => {
						var text_5 = text();

						template_effect(() => set_text(text_5, `· Suche: ${get(s).search_schema ?? ''}`));
						append($$anchor, text_5);
					};

					if_block(node_2, ($$render) => {
						if (get(s).search_schema) $$render(consequent_2);
					});
				}

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
			set_attribute(input_1, 'placeholder', 'Direktlink, z. B. https://dienst.de/anime/stream/{slug}/staffel-1');

			var input_2 = sibling(input_1, 2);
			set_attribute(input_2, 'placeholder', 'Suche (Rückfall), z. B. https://dienst.de/animes?q={q}');

			var button_7 = sibling(input_2, 2);

			var p_2 = sibling(div_10, 2);
			var code_1 = child(p_2);

			code_1.textContent = '{slug}';

			var code_2 = sibling(code_1, 6);

			code_2.textContent = '{q}';

			var code_3 = sibling(code_2, 2);

			code_3.textContent = '{q}';
			template_effect(() => set_text(text_2, `Streaming-Dienste für ${configName() ?? ''} (eigener Satz je Config)`));
			bind_value(input, () => get(newName), ($$value) => set(newName, $$value));
			bind_value(input_1, () => get(newUrl), ($$value) => set(newUrl, $$value));
			bind_value(input_2, () => get(newSearch), ($$value) => set(newSearch, $$value));
			delegated('click', button_7, addSvc);
			append($$anchor, section_2);
		};

		var consequent_12 = ($$anchor) => {
			var section_3 = root_13$4();
			var node_3 = child(section_3);

			{
				var consequent_4 = ($$anchor) => {
					Ai_EmbeddedSettings($$anchor, {});
				};

				var consequent_5 = ($$anchor) => {
					var p_3 = root_6$5();
					var text_6 = only_child(p_3, true);

					template_effect(() => set_text(text_6, get(aiMsg) || 'Lade …'));
					append($$anchor, p_3);
				};

				var alternate = ($$anchor) => {
					var fragment_3 = root_12$4();
					var div_11 = first_child(fragment_3);
					var div_12 = sibling(child(div_11), 2);
					var button_8 = child(div_12);
					let classes_4;
					var button_9 = sibling(button_8, 2);
					let classes_5;

					var node_4 = sibling(div_11, 2);

					{
						var consequent_10 = ($$anchor) => {
							var div_13 = root_10$5();
							var div_14 = sibling(child(div_13), 2);
							var label_2 = sibling(child(div_14), 2);
							var input_3 = child(label_2);

							var label_3 = sibling(label_2, 2);
							var input_4 = child(label_3);

							var node_5 = sibling(div_14, 2);

							{
								var consequent_7 = ($$anchor) => {
									var fragment_4 = root_8$5();
									var div_15 = first_child(fragment_4);
									var button_10 = child(div_15);
									let classes_6;
									var button_11 = sibling(button_10, 2);
									let classes_7;

									var input_5 = sibling(div_15, 2);

									var input_6 = sibling(input_5, 2);

									var node_6 = sibling(input_6, 2);

									{
										var consequent_6 = ($$anchor) => {
											var input_7 = root_7$5();

											template_effect(() => set_attribute(input_7, 'placeholder', get(ai).ext_key_set
												? 'API-Schlüssel gespeichert (zum Ändern neu eingeben)'
												: 'API-Schlüssel (optional)'));

											bind_value(input_7, () => get(aiKey), ($$value) => set(aiKey, $$value));
											append($$anchor, input_7);
										};

										if_block(node_6, ($$render) => {
											if (get(ai).ext_kind === 'openai') $$render(consequent_6);
										});
									}

									var button_12 = sibling(node_6, 2);

									template_effect(() => {
										classes_6 = set_class(button_10, 1, 'svelte-lqmuci', null, classes_6, { on: get(ai).ext_kind === 'openai' });
										classes_7 = set_class(button_11, 1, 'svelte-lqmuci', null, classes_7, { on: get(ai).ext_kind === 'ollama' });

										set_attribute(input_5, 'placeholder', get(ai).ext_kind === 'ollama'
											? 'URL, z. B. http://localhost:11434'
											: 'URL, z. B. https://api.anbieter.de');
									});

									delegated('click', button_10, () => get(ai).ext_kind = 'openai');
									delegated('click', button_11, () => get(ai).ext_kind = 'ollama');
									bind_value(input_5, () => get(ai).ext_url, ($$value) => get(ai).ext_url = $$value);
									bind_value(input_6, () => get(ai).ext_model, ($$value) => get(ai).ext_model = $$value);
									delegated('click', button_12, saveExternal);
									append($$anchor, fragment_4);
								};

								if_block(node_5, ($$render) => {
									if (get(ai).mode === 'external') $$render(consequent_7);
								});
							}

							var button_13 = sibling(node_5, 2);
							var node_7 = sibling(button_13, 2);

							{
								var consequent_9 = ($$anchor) => {
									var fragment_5 = root_9$5();
									var p_4 = first_child(fragment_5);
									var text_7 = child(p_4);
									var b = sibling(text_7);
									var text_8 = only_child(b, true);
									var node_8 = sibling(b);

									{
										var consequent_8 = ($$anchor) => {
											var text_9 = text();

											template_effect(() => set_text(text_9, `· baut auf: ${get(aiSt).indexing.done ?? ''}/${get(aiSt).indexing.total ?? ''}`));
											append($$anchor, text_9);
										};

										if_block(node_8, ($$render) => {
											if (get(aiSt).indexing?.running) $$render(consequent_8);
										});
									}

									var button_14 = sibling(p_4, 2);
									var text_10 = only_child(button_14, true);
									var button_15 = sibling(button_14, 2);

									template_effect(
										($0) => {
											set_text(text_7, `Index: ${get(aiSt).embedded ?? ''} von ${get(aiSt).media ?? ''} Titeln${get(aiSt).problem ? ' · ' : ''}`);
											set_text(text_8, get(aiSt).problem ?? '');
											button_14.disabled = get(aiSt).indexing?.running;
											set_text(text_10, $0);
										},
										[
											() => get(aiSt).problem?.includes('Index passt') ? 'Index neu aufbauen' : 'Neue Titel nachindizieren'
										]
									);

									delegated('click', button_14, () => startIndex(false));
									delegated('click', button_15, () => startIndex(true));
									append($$anchor, fragment_5);
								};

								if_block(node_7, ($$render) => {
									if (get(aiSt)) $$render(consequent_9);
								});
							}

							template_effect(() => {
								set_checked(input_3, get(ai).mode === 'server');
								set_checked(input_4, get(ai).mode === 'external');
								button_13.disabled = get(aiBusy);
							});

							delegated('change', input_3, () => saveAi({ mode: 'server' }));
							delegated('change', input_4, () => get(ai).mode = 'external');
							delegated('click', button_13, testAi);
							append($$anchor, div_13);
						};

						if_block(node_4, ($$render) => {
							if (get(ai).enabled) $$render(consequent_10);
						});
					}

					var node_9 = sibling(node_4, 2);

					{
						var consequent_11 = ($$anchor) => {
							var p_5 = root_11$5();
							var text_11 = only_child(p_5, true);

							template_effect(() => set_text(text_11, get(aiMsg)));
							append($$anchor, p_5);
						};

						if_block(node_9, ($$render) => {
							if (get(aiMsg)) $$render(consequent_11);
						});
					}

					template_effect(() => {
						classes_4 = set_class(button_8, 1, 'svelte-lqmuci', null, classes_4, { on: get(ai).enabled });
						classes_5 = set_class(button_9, 1, 'svelte-lqmuci', null, classes_5, { on: !get(ai).enabled });
					});

					delegated('click', button_8, () => saveAi({ enabled: true }));
					delegated('click', button_9, () => saveAi({ enabled: false }));
					append($$anchor, fragment_3);
				};

				if_block(node_3, ($$render) => {
					if (conn.mode === 'embedded') $$render(consequent_4); else if (!get(ai)) $$render(consequent_5, 1); else $$render(alternate, -1);
				});
			}
			append($$anchor, section_3);
		};

		var consequent_16 = ($$anchor) => {
			var section_4 = root_15$3();
			var div_16 = child(section_4);
			var button_16 = sibling(child(div_16), 4);
			var node_10 = sibling(button_16, 2);

			{
				var consequent_13 = ($$anchor) => {
					var p_6 = root_14$3();
					var text_12 = only_child(p_6);

					template_effect(() => set_text(text_12, `${get(syncInfo).count ?? ''} Einträge würden synchronisiert.`));
					append($$anchor, p_6);
				};

				if_block(node_10, ($$render) => {
					if (get(syncInfo)) $$render(consequent_13);
				});
			}

			var button_17 = sibling(node_10, 2);
			var node_11 = sibling(button_17, 2);

			{
				var consequent_14 = ($$anchor) => {
					var p_7 = root_11$5();
					var text_13 = only_child(p_7, true);

					template_effect(() => set_text(text_13, get(syncMsg)));
					append($$anchor, p_7);
				};

				if_block(node_11, ($$render) => {
					if (get(syncMsg)) $$render(consequent_14);
				});
			}

			var div_17 = sibling(div_16, 2);
			var input_8 = sibling(child(div_17), 4);

			var button_18 = sibling(input_8, 2);
			var text_14 = only_child(button_18, true);
			var node_12 = sibling(button_18, 2);

			{
				var consequent_15 = ($$anchor) => {
					var p_8 = root_11$5();
					var text_15 = only_child(p_8, true);

					template_effect(() => set_text(text_15, get(impMsg)));
					append($$anchor, p_8);
				};

				if_block(node_12, ($$render) => {
					if (get(impMsg)) $$render(consequent_15);
				});
			}

			template_effect(
				($0) => {
					button_16.disabled = get(syncBusy);
					button_17.disabled = get(syncBusy);
					button_18.disabled = $0;
					set_text(text_14, get(impBusy) ? 'Importiere …' : 'Von AniList importieren');
				},
				[() => get(impBusy) || !get(aniUser).trim()]
			);

			delegated('click', button_16, loadPreview);
			delegated('click', button_17, runSync);
			delegated('keydown', input_8, (e) => e.key === 'Enter' && runImport());
			bind_value(input_8, () => get(aniUser), ($$value) => set(aniUser, $$value));
			delegated('click', button_18, runImport);
			append($$anchor, section_4);
		};

		var consequent_18 = ($$anchor) => {
			var section_5 = root_16$2();
			var div_18 = child(section_5);
			var button_19 = sibling(child(div_18), 2);
			var button_20 = sibling(button_19, 2);
			var input_9 = sibling(button_20, 2);

			bind_this(input_9, ($$value) => set(importEl, $$value), () => get(importEl));

			var button_21 = sibling(input_9, 2);
			var node_13 = sibling(button_21, 2);

			{
				var consequent_17 = ($$anchor) => {
					var p_9 = root_11$5();
					var text_16 = only_child(p_9, true);

					template_effect(() => set_text(text_16, get(importMsg)));
					append($$anchor, p_9);
				};

				if_block(node_13, ($$render) => {
					if (get(importMsg)) $$render(consequent_17);
				});
			}
			delegated('click', button_19, () => downloadExport('mal').catch((e) => alert(e.message)));
			delegated('click', button_20, () => downloadExport('json').catch((e) => alert(e.message)));
			delegated('change', input_9, doImport);
			delegated('click', button_21, () => get(importEl)?.click());
			append($$anchor, section_5);
		};

		var consequent_21 = ($$anchor) => {
			var section_6 = root_20$1();
			var div_19 = child(section_6);
			var node_14 = sibling(child(div_19), 2);

			{
				var consequent_19 = ($$anchor) => {
					var fragment_7 = root_17$2();
					var p_10 = first_child(fragment_7);
					var code_4 = sibling(child(p_10));
					var text_17 = only_child(code_4, true);

					var p_11 = sibling(p_10, 2);
					var code_5 = sibling(child(p_11));
					var text_18 = only_child(code_5, true);

					var p_12 = sibling(p_11, 2);
					var text_19 = only_child(p_12, true);

					template_effect(() => {
						set_text(text_17, get(pair).api_base);
						set_text(text_18, get(pair).token);
						set_text(text_19, get(pair).note);
					});

					append($$anchor, fragment_7);
				};

				var consequent_20 = ($$anchor) => {
					var p_13 = root_18$2();

					append($$anchor, p_13);
				};

				var alternate_1 = ($$anchor) => {
					var p_14 = root_19$1();

					append($$anchor, p_14);
				};

				if_block(node_14, ($$render) => {
					if (get(pair) && !get(pair).error) $$render(consequent_19); else if (get(pair)?.error) $$render(consequent_20, 1); else $$render(alternate_1, -1);
				});
			}
			append($$anchor, section_6);
		};

		var consequent_24 = ($$anchor) => {
			var section_7 = root_22$1();
			var div_20 = child(section_7);
			var p_15 = sibling(child(div_20), 2);
			var text_20 = only_child(p_15);
			var input_10 = sibling(p_15, 2);

			var button_22 = sibling(input_10, 2);
			var text_21 = only_child(button_22, true);
			var node_15 = sibling(button_22, 2);

			{
				var consequent_22 = ($$anchor) => {
					var button_23 = root_21$1();

					delegated('click', button_23, handleReset);
					append($$anchor, button_23);
				};

				if_block(node_15, ($$render) => {
					if (hConfigured()) $$render(consequent_22);
				});
			}

			var node_16 = sibling(node_15, 2);

			{
				var consequent_23 = ($$anchor) => {
					var p_16 = root_11$5();
					var text_22 = only_child(p_16, true);

					template_effect(() => set_text(text_22, get(hMsg)));
					append($$anchor, p_16);
				};

				if_block(node_16, ($$render) => {
					if (get(hMsg)) $$render(consequent_23);
				});
			}

			template_effect(() => {
				set_text(text_20, `Standardmäßig unsichtbar. ${hConfigured()
					? 'Passwort eingeben zum Entsperren.'
					: 'Lege ein Passwort fest — danach erscheint „Hentai" im Medientyp-Menü (oben neben dem Logo). Verschwindet bei jedem Neuladen wieder.'}`);

				set_attribute(input_10, 'placeholder', hConfigured() ? 'Passwort' : 'Passwort festlegen');
				set_text(text_21, hConfigured() ? 'Entsperren' : 'Passwort setzen & entsperren');
			});

			delegated('keydown', input_10, (e) => e.key === 'Enter' && handleH());
			bind_value(input_10, () => get(hPw), ($$value) => set(hPw, $$value));
			delegated('click', button_22, handleH);
			append($$anchor, section_7);
		};

		var alternate_2 = ($$anchor) => {
			var fragment_8 = root_25$1();
			var section_8 = first_child(fragment_8);
			var div_21 = child(section_8);
			var p_17 = sibling(child(div_21), 2);
			var text_23 = sibling(child(p_17), 6);

			var node_17 = sibling(section_8, 2);

			{
				var consequent_26 = ($$anchor) => {
					var section_9 = root_23$1();
					var div_22 = child(section_9);
					var button_24 = sibling(child(div_22), 4);
					var node_18 = sibling(button_24, 2);

					{
						var consequent_25 = ($$anchor) => {
							var p_18 = root_11$5();
							var text_24 = only_child(p_18, true);

							template_effect(() => set_text(text_24, get(catMsg)));
							append($$anchor, p_18);
						};

						if_block(node_18, ($$render) => {
							if (get(catMsg)) $$render(consequent_25);
						});
					}
					delegated('click', button_24, checkCat);
					append($$anchor, section_9);
				};

				var consequent_27 = ($$anchor) => {
					var section_10 = root_24$1();
					var div_23 = child(section_10);
					var p_19 = sibling(child(div_23), 2);
					var text_25 = only_child(p_19, true);
					var button_25 = sibling(p_19, 2);
					var text_26 = only_child(button_25, true);

					template_effect(() => {
						set_text(text_25, conn.mode === 'plugin'
							? `Backend: ${conn.server}`
							: 'Dieses Backend ist passwortgeschützt.');

						set_text(text_26, conn.mode === 'plugin' ? 'Verbindung ändern / trennen' : 'Abmelden');
					});

					delegated('click', button_25, () => {
						$$props.onclose();
						disconnect();
					});

					append($$anchor, section_10);
				};

				if_block(node_17, ($$render) => {
					if (conn.mode === 'embedded') $$render(consequent_26); else if (conn.mode === 'plugin' || conn.key) $$render(consequent_27, 1);
				});
			}

			template_effect(() => set_text(text_23, ` ${stats().anime ?? 0 ?? ''} Anime · ${stats().h ?? 0 ?? ''} H · ${stats().anime_dubbed ?? 0 ?? ''} dt. synchronisiert.`));
			append($$anchor, fragment_8);
		};

		if_block(node, ($$render) => {
			if (get(cat) === 'profil') $$render(consequent); else if (get(cat) === 'medien') $$render(consequent_1, 1); else if (get(cat) === 'listen') $$render(consequent_3, 2); else if (get(cat) === 'ki') $$render(consequent_12, 3); else if (get(cat) === 'import') $$render(consequent_16, 4); else if (get(cat) === 'export') $$render(consequent_18, 5); else if (get(cat) === 'apps') $$render(consequent_21, 6); else if (get(cat) === 'privat') $$render(consequent_24, 7); else $$render(alternate_2, -1);
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

var root$8 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1qjp115"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0"></path></svg>`);
var root_1$8 = from_svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1qjp115"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`);
var root_2$8 = from_html(`<span class="err svelte-1qjp115"> </span>`);
var root_3$6 = from_html(`<div class="pwbar svelte-1qjp115"><input type="password" class="svelte-1qjp115"/> <button class="svelte-1qjp115"> </button> <!></div>`);
var root_4$6 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 7c-9 0-15 6-15 16 0 7 4 12 9 15l6 3 6-3c5-3 9-8 9-15 0-10-6-16-15-16Z"></path><path d="M17 23c1.5-2 4-2 5.5 0"></path><path d="M25.5 23c1.5-2 4-2 5.5 0"></path><path d="M20 33c2 1.5 6 1.5 8 0"></path></svg>`);
var root_5$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="9" width="32" height="30" rx="2"></rect><path d="M24 9v30"></path><path d="M13 16h7M13 22h7M28 16h7M28 27h7"></path></svg>`);
var root_6$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 12c-3-2.5-8-3-13-2v26c5-1 10-.5 13 2 3-2.5 8-3 13-2V10c-5-1-10-.5-13 2Z"></path><path d="M24 12v26"></path></svg>`);
var root_7$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="14" width="32" height="22" rx="2"></rect><path d="M8 20h32"></path><path d="M14 14l-2 6M22 14l-2 6M30 14l-2 6M38 14l-2 6"></path></svg>`);
var root_8$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><rect x="8" y="16" width="32" height="22" rx="2"></rect><path d="M18 16l6-6 6 6"></path></svg>`);
var root_9$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M12 28v-4a12 12 0 0 1 24 0v4"></path><rect x="8" y="27" width="7" height="11" rx="2"></rect><rect x="33" y="27" width="7" height="11" rx="2"></rect></svg>`);
var root_10$4 = from_svg(`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1qjp115"><path d="M24 8c-7 0-13 5-13 12 0 4 2 7 5 9l-1 7 7-4h2c7 0 13-5 13-12S31 8 24 8Z"></path><circle cx="19" cy="20" r="1.5"></circle><circle cx="29" cy="20" r="1.5"></circle></svg>`);
var root_11$4 = from_html(`<span role="button" tabindex="0" title="Config löschen"> </span>`);
var root_12$3 = from_html(`<button><span class="icon svelte-1qjp115"><!></span> <span class="txt svelte-1qjp115"><span class="name svelte-1qjp115"> </span> <span class="desc svelte-1qjp115"> </span></span> <!></button>`);
var root_13$3 = from_html(`<div class="wrap svelte-1qjp115"><header class="svelte-1qjp115"><div><div class="kicker svelte-1qjp115">Medientyp</div> <h1 class="svelte-1qjp115">Was möchtest du tracken?</h1> <p class="svelte-1qjp115">Jede Config ist ein eigener Bereich. Klick wählt sie aus — der Name oben wechselt mit.</p></div> <div class="hd-actions svelte-1qjp115"><button title="Versteckte Kategorien" aria-label="Versteckte Kategorien"><!></button> <button class="close svelte-1qjp115" aria-label="Schließen">✕</button></div></header> <!> <div class="grid svelte-1qjp115"></div></div>`);

const $$css$8 = {
	hash: 'svelte-1qjp115',
	code: '.wrap.svelte-1qjp115 {position:fixed;inset:0;z-index:60;overflow-y:auto;background:var(--bg);padding:calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 40px);}header.svelte-1qjp115 {display:flex;justify-content:space-between;align-items:flex-start;max-width:760px;margin:0 auto 20px;gap:16px;}.kicker.svelte-1qjp115 {color:var(--accent);font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}h1.svelte-1qjp115 {font-size:clamp(1.4rem, 4vw, 2rem);font-weight:800;letter-spacing:-0.02em;margin:4px 0 6px;}header.svelte-1qjp115 p:where(.svelte-1qjp115) {color:var(--text-muted);margin:0;}.hd-actions.svelte-1qjp115 {display:flex;gap:8px;flex:0 0 auto;}.lock.svelte-1qjp115, .close.svelte-1qjp115 {width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer;display:grid;place-items:center;}.lock.svelte-1qjp115 svg:where(.svelte-1qjp115) {width:18px;height:18px;}.lock.on.svelte-1qjp115 {color:var(--accent);border-color:var(--accent);}.pwbar.svelte-1qjp115 {max-width:760px;margin:0 auto 18px;display:flex;gap:8px;align-items:center;}.pwbar.svelte-1qjp115 input:where(.svelte-1qjp115) {flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--surface-2);color:var(--text);}.pwbar.svelte-1qjp115 button:where(.svelte-1qjp115) {padding:10px 16px;border-radius:8px;border:0;background:var(--accent);color:#022;font-weight:700;cursor:pointer;}.pwbar.svelte-1qjp115 .err:where(.svelte-1qjp115) {color:#e0607e;font-size:0.8rem;}.grid.svelte-1qjp115 {max-width:760px;margin:0 auto;display:grid;gap:12px;grid-template-columns:repeat(2, 1fr);}.card.svelte-1qjp115 {position:relative;display:flex;align-items:center;gap:14px;text-align:left;padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);cursor:pointer;transition:border-color 0.15s, transform 0.15s;}.card.svelte-1qjp115:hover {border-color:var(--accent);transform:translateY(-2px);}.card.hidden.svelte-1qjp115 {border-color:color-mix(in srgb, var(--accent-2) 50%, var(--border));}.card.hidden.svelte-1qjp115 .icon:where(.svelte-1qjp115) {color:var(--accent-2);}.icon.svelte-1qjp115 {flex:0 0 auto;width:44px;height:44px;color:var(--accent);}.icon.svelte-1qjp115 svg:where(.svelte-1qjp115) {width:100%;height:100%;}.txt.svelte-1qjp115 {display:flex;flex-direction:column;min-width:0;flex:1;}.name.svelte-1qjp115 {font-weight:700;font-size:1rem;}.desc.svelte-1qjp115 {font-size:0.8rem;color:var(--text-muted);}.del.svelte-1qjp115 {position:absolute;top:8px;right:8px;font-size:0.68rem;color:var(--text-muted);border:1px solid var(--border);padding:2px 7px;border-radius:20px;background:var(--surface-2);line-height:1.4;}.del.svelte-1qjp115:hover {color:#e0607e;border-color:#e0607e;}.del.confirm.svelte-1qjp115 {color:#fff;background:#e0607e;border-color:#e0607e;font-weight:700;}\n  @media (max-width: 640px) {.grid.svelte-1qjp115 {grid-template-columns:1fr;} }'
};

function MediaTypePicker($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$8);

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
			var svg = root$8();

			append($$anchor, svg);
		};

		var alternate = ($$anchor) => {
			var svg_1 = root_1$8();

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
					var span = root_2$8();
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
				var svg_3 = root_5$4();

				append($$anchor, svg_3);
			};

			var consequent_5 = ($$anchor) => {
				var svg_4 = root_6$4();

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

var root$7 = from_html(`<div class="profile-head svelte-cjprq"><div class="pavatar svelte-cjprq">EF</div> <div class="pmeta svelte-cjprq"><h1 class="svelte-cjprq"> </h1> <p class="svelte-cjprq"> </p></div></div>`);
var root_1$7 = from_html(`<button> </button>`);
var root_2$7 = from_html(`<div class="loading svelte-cjprq">lädt Statistik…</div>`);
var root_3$5 = from_html(`<div class="col svelte-cjprq"><div class="colbar svelte-cjprq"></div> <span class="svelte-cjprq"> </span></div>`);
var root_4$5 = from_html(`<div class="empty inline svelte-cjprq">Noch keine Daten.</div>`);
var root_5$3 = from_html(`<div class="bar svelte-cjprq"><span class="bl svelte-cjprq"> </span> <div class="track svelte-cjprq"><div class="fill svelte-cjprq"></div></div> <span class="bc svelte-cjprq"> </span></div>`);
var root_6$3 = from_html(`<div class="bars svelte-cjprq"></div>`);
var root_7$3 = from_svg(`<circle class="donut-seg svelte-cjprq" cx="21" cy="21" r="15.915"><title> </title></circle>`);
var root_8$3 = from_html(`<li class="svelte-cjprq"><span class="dot svelte-cjprq"></span> <span class="lg-label svelte-cjprq"> </span> <span class="lg-pct svelte-cjprq"> </span></li>`);
var root_9$3 = from_html(`<div class="donut-wrap svelte-cjprq"><svg class="donut svelte-cjprq" viewBox="0 0 42 42" role="img" aria-label="Status-Verteilung"><circle class="donut-bg svelte-cjprq" cx="21" cy="21" r="15.915"></circle><!></svg> <ul class="legend svelte-cjprq"></ul></div>`);
var root_10$3 = from_html(`<div class="donut-wrap svelte-cjprq"><svg class="donut svelte-cjprq" viewBox="0 0 42 42" role="img" aria-label="Format-Verteilung"><circle class="donut-bg svelte-cjprq" cx="21" cy="21" r="15.915"></circle><!></svg> <ul class="legend svelte-cjprq"></ul></div>`);
var root_11$3 = from_svg(`<circle class="line-pt svelte-cjprq" r="3"><title> </title></circle>`);
var root_12$2 = from_html(`<span class="svelte-cjprq"> </span>`);
var root_13$2 = from_html(`<div class="line-wrap svelte-cjprq"><svg preserveAspectRatio="none" class="line svelte-cjprq" role="img" aria-label="Erscheinungsjahre"><polygon class="line-area svelte-cjprq"></polygon><polyline class="line-stroke svelte-cjprq"></polyline><!></svg> <div class="line-x svelte-cjprq"></div></div>`);
var root_14$2 = from_html(`<div class="tiles svelte-cjprq"><div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Titel gesamt</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Folgen gesehen</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Tage geschaut</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Tage geplant</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Ø Wertung</span></div> <div class="tile svelte-cjprq"><span class="n svelte-cjprq"> </span><span class="l svelte-cjprq">Std-Abweichung</span></div></div> <section class="block svelte-cjprq"><div class="bhead svelte-cjprq"><h2 class="svelte-cjprq">Wertungen</h2> <div class="toggle svelte-cjprq"><button>Titel</button> <button>Stunden</button></div></div> <div class="chart svelte-cjprq"></div></section> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Folgen-Umfang</h2> <!></section> <div class="duo svelte-cjprq"><section class="block svelte-cjprq"><h2 class="svelte-cjprq">Status-Verteilung</h2> <!></section> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Format-Verteilung</h2> <!></section></div> <section class="block svelte-cjprq"><h2 class="svelte-cjprq">Erscheinungsjahre</h2> <!></section>`, 1);
var root_15$2 = from_html(`<div class="loading svelte-cjprq"> </div>`);
var root_16$1 = from_html(`<div class="empty svelte-cjprq">AniList ist gerade nicht erreichbar — später erneut öffnen.</div>`);
var root_17$1 = from_html(`<div class="empty svelte-cjprq">Noch keine Daten — füge Titel mit AniList-ID zu deiner Liste hinzu.</div>`);
var root_18$1 = from_html(`<div class="gfoot svelte-cjprq"> </div>`);
var root_19 = from_html(`<div class="gcard svelte-cjprq"><div class="gtop svelte-cjprq"><span class="rank svelte-cjprq"> </span> <span class="gname svelte-cjprq"> </span></div> <div class="gstats svelte-cjprq"><div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Titel in deiner Liste</span></div></div> <!></div>`);
var root_20 = from_html(`<p class="note svelte-cjprq"> </p>`);
var root_21 = from_html(`<div class="grid svelte-cjprq"></div> <!> <p class="note svelte-cjprq">Daten: AniList · berücksichtigt bis zu 100 zuletzt aktualisierte Titel deiner Liste.</p>`, 1);
var root_22 = from_html(`<div class="bhead card-head svelte-cjprq"><h2 class="svelte-cjprq"> </h2></div> <!>`, 1);
var root_23 = from_html(`<div class="empty svelte-cjprq">Noch keine Daten — sie entstehen aus den Titeln deiner Liste.</div>`);
var root_24 = from_html(`<div class="gcard svelte-cjprq"><div class="gtop svelte-cjprq"><span class="rank svelte-cjprq"></span> <span class="gname svelte-cjprq"> </span></div> <div class="gstats svelte-cjprq"><div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Anzahl</span></div> <div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Ø Wertung</span></div> <div class="gstat svelte-cjprq"><span class="gv svelte-cjprq"> </span><span class="gl svelte-cjprq">Std</span></div></div> <div class="gbar svelte-cjprq"><div class="gbar-fill svelte-cjprq"></div></div> <div class="gfoot svelte-cjprq"> </div></div>`);
var root_25 = from_html(`<div class="grid svelte-cjprq"></div>`);
var root_26 = from_html(`<div class="bhead card-head svelte-cjprq"><h2 class="svelte-cjprq"> </h2> <div class="toggle svelte-cjprq"></div></div> <!>`, 1);
var root_27 = from_html(`<!> <div class="stats svelte-cjprq"><aside class="side svelte-cjprq"><div class="side-head svelte-cjprq">Anime-Statistik</div> <!></aside> <section class="content svelte-cjprq"><!></section></div>`, 1);

const $$css$7 = {
	hash: 'svelte-cjprq',
	code: '.profile-head.svelte-cjprq {max-width:var(--maxw);margin:0 auto;padding:28px 20px 0;display:flex;align-items:center;gap:16px;}.pavatar.svelte-cjprq {width:64px;height:64px;border-radius:var(--radius);background:linear-gradient(135deg, var(--accent), var(--accent-dim));display:grid;place-items:center;font-weight:800;font-size:1.3rem;color:var(--on-accent);}.pmeta.svelte-cjprq h1:where(.svelte-cjprq) {margin:0;font-size:1.4rem;font-weight:600;color:var(--text-strong);}.pmeta.svelte-cjprq p:where(.svelte-cjprq) {margin:2px 0 0;color:var(--text-muted);font-size:0.85rem;}.stats.svelte-cjprq {max-width:var(--maxw);margin:0 auto;padding:24px 20px 60px;display:grid;grid-template-columns:220px 1fr;gap:30px;}\n\n  /* Sidebar — AniList Stats-Seitennav */.side.svelte-cjprq {display:flex;flex-direction:column;gap:2px;position:sticky;top:90px;align-self:start;}.side-head.svelte-cjprq {font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);font-weight:700;padding:4px 14px 8px;}.side.svelte-cjprq button:where(.svelte-cjprq) {text-align:left;padding:10px 14px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-weight:600;font-size:0.86rem;transition:background 0.15s, color 0.15s;}.side.svelte-cjprq button:where(.svelte-cjprq):hover:not(:disabled) {color:var(--text);background:var(--surface-2);}.side.svelte-cjprq button.on:where(.svelte-cjprq) {background:var(--accent);color:var(--on-accent);}.note.svelte-cjprq {color:var(--text-muted);font-size:0.76rem;margin:14px 2px 0;}.content.svelte-cjprq {min-width:0;}.loading.svelte-cjprq, .empty.svelte-cjprq {text-align:center;color:var(--text-muted);padding:50px;background:var(--surface);border-radius:var(--radius);}.empty.inline.svelte-cjprq {padding:24px;background:transparent;}\n\n  /* Stat-Tiles */.tiles.svelte-cjprq {display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:16px;margin-bottom:24px;}.tile.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:20px 16px;display:flex;flex-direction:column;gap:6px;box-shadow:var(--shadow-sm);}.tile.svelte-cjprq .n:where(.svelte-cjprq) {font-size:2rem;font-weight:700;color:var(--accent);line-height:1;}.tile.svelte-cjprq .l:where(.svelte-cjprq) {font-size:0.78rem;color:var(--text-muted);}\n\n  /* Karten-Blöcke */.block.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:22px 24px;margin-bottom:24px;box-shadow:var(--shadow-sm);}.bhead.svelte-cjprq {display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;}.card-head.svelte-cjprq {margin-bottom:20px;}h2.svelte-cjprq {font-size:0.8rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);font-weight:600;margin:0 0 18px;}.bhead.svelte-cjprq h2:where(.svelte-cjprq) {margin:0;}\n\n  /* Flache Segment-Toggles */.toggle.svelte-cjprq {display:inline-flex;gap:2px;background:var(--surface-2);border-radius:var(--radius);padding:2px;}.toggle.svelte-cjprq button:where(.svelte-cjprq) {padding:6px 13px;border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.78rem;font-weight:600;border-radius:var(--radius-sm);transition:background 0.15s, color 0.15s;}.toggle.svelte-cjprq button:where(.svelte-cjprq):hover {color:var(--text);}.toggle.svelte-cjprq button.on:where(.svelte-cjprq) {background:var(--accent);color:var(--on-accent);}\n\n  /* Säulendiagramm Wertungen */.chart.svelte-cjprq {display:flex;align-items:flex-end;gap:10px;height:170px;}.col.svelte-cjprq {flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:8px;}.colbar.svelte-cjprq {width:100%;min-height:3px;background:var(--accent);border-radius:var(--radius) var(--radius) 0 0;transition:height 0.3s;}.col.svelte-cjprq span:where(.svelte-cjprq) {font-size:0.72rem;color:var(--text-muted);}\n\n  /* Balken */.bars.svelte-cjprq {display:flex;flex-direction:column;gap:10px;}.bar.svelte-cjprq {display:grid;grid-template-columns:160px 1fr 64px;align-items:center;gap:12px;font-size:0.82rem;}.bl.svelte-cjprq {color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.track.svelte-cjprq {background:var(--surface-2);border-radius:var(--radius);height:8px;overflow:hidden;}.fill.svelte-cjprq {height:100%;background:var(--accent);border-radius:var(--radius);transition:width 0.3s;}.bc.svelte-cjprq {text-align:right;color:var(--text-strong);font-weight:600;}\n\n  /* Donuts */.duo.svelte-cjprq {display:grid;grid-template-columns:1fr 1fr;gap:24px;}.duo.svelte-cjprq .block:where(.svelte-cjprq) {margin-bottom:24px;}.donut-wrap.svelte-cjprq {display:flex;align-items:center;gap:22px;}.donut.svelte-cjprq {width:128px;height:128px;flex:0 0 auto;transform:rotate(-90deg);}.donut-bg.svelte-cjprq {fill:none;stroke:var(--surface-2);stroke-width:4;}.donut-seg.svelte-cjprq {fill:none;stroke-width:4;transition:stroke-dasharray 0.3s;}.legend.svelte-cjprq {list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;min-width:0;flex:1;}.legend.svelte-cjprq li:where(.svelte-cjprq) {display:flex;align-items:center;gap:8px;font-size:0.8rem;}.dot.svelte-cjprq {width:11px;height:11px;border-radius:3px;flex:0 0 auto;}.lg-label.svelte-cjprq {color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}.lg-pct.svelte-cjprq {color:var(--text-strong);font-weight:600;margin-left:auto;}\n\n  /* Linie */.line-wrap.svelte-cjprq {position:relative;}.line.svelte-cjprq {width:100%;height:160px;display:block;overflow:visible;}.line-area.svelte-cjprq {fill:color-mix(in srgb, var(--accent) 14%, transparent);stroke:none;}.line-stroke.svelte-cjprq {fill:none;stroke:var(--accent);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round;}.line-pt.svelte-cjprq {fill:var(--surface);stroke:var(--accent);stroke-width:2;}.line-x.svelte-cjprq {position:relative;height:16px;margin-top:4px;}.line-x.svelte-cjprq span:where(.svelte-cjprq) {position:absolute;transform:translateX(-50%);font-size:0.68rem;color:var(--text-muted);white-space:nowrap;}\n\n  /* Genres/Tags Karten-Grid */.grid.svelte-cjprq {display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;}.gcard.svelte-cjprq {background:var(--surface);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:12px;}.gtop.svelte-cjprq {display:flex;align-items:baseline;gap:8px;}.rank.svelte-cjprq {color:var(--accent);font-weight:700;font-size:0.9rem;flex:0 0 auto;}.gname.svelte-cjprq {color:var(--text-strong);font-weight:600;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.gstats.svelte-cjprq {display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;}.gstat.svelte-cjprq {display:flex;flex-direction:column;gap:2px;}.gv.svelte-cjprq {color:var(--text-strong);font-weight:700;font-size:0.95rem;}.gl.svelte-cjprq {color:var(--text-muted);font-size:0.68rem;}.gbar.svelte-cjprq {background:var(--surface-2);border-radius:var(--radius);height:6px;overflow:hidden;}.gbar-fill.svelte-cjprq {height:100%;background:var(--accent);border-radius:var(--radius);transition:width 0.3s;}.gfoot.svelte-cjprq {font-size:0.72rem;color:var(--text-muted);text-align:right;}\n\n  @media (max-width: 860px) {.duo.svelte-cjprq {grid-template-columns:1fr;}.grid.svelte-cjprq {grid-template-columns:repeat(2, 1fr);}\n  }\n  @media (max-width: 680px) {.stats.svelte-cjprq {grid-template-columns:1fr;gap:20px;}.side.svelte-cjprq {flex-direction:row;flex-wrap:wrap;position:static;gap:4px;}.side-head.svelte-cjprq {width:100%;padding:0 4px 2px;}.grid.svelte-cjprq {grid-template-columns:1fr;}.bar.svelte-cjprq {grid-template-columns:110px 1fr 54px;}.donut-wrap.svelte-cjprq {flex-direction:column;align-items:flex-start;}\n  }'
};

function Stats($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$7);

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

	// Sidebar-Seiten
	const SIDE = [
		{ id: 'overview', label: 'Übersicht' },
		{ id: 'genres', label: 'Genres' },
		{ id: 'tags', label: 'Tags' },
		{ id: 'studios', label: 'Studios' },
		{ id: 'voice', label: 'Sprecher' },
		{ id: 'staff', label: 'Staff' }
	];

	// Sprecher/Staff: aus den Titeln der eigenen Liste, per AniList (Laufzeit-Abruf, gecacht)
	let credits = state(proxy([]));

	let credState = state('idle');
	let credProg = state(proxy({ done: 0, total: 0 }));
	let credTried = false;

	async function loadCredits() {
		if (credTried) return;

		credTried = true;
		set(credState, 'loading');

		try {
			const d = await api$1().anime({ watch_status: 'all', sort: 'recent', limit: 100 });
			const ids = (d?.items ?? []).map((m) => m.anilist_id).filter(Boolean);

			set(credProg, { done: 0, total: ids.length }, true);
			set(credits, await getCredits(ids, (done, total) => set(credProg, { done, total }, true)), true);
			set(credState, 'done');
		} catch {
			set(credState, 'error');
		}
	}

	user_effect(() => {
		if (get(page) === 'voice' || get(page) === 'staff') loadCredits();
	});

	function rankPeople(kind) {
		const m = new Map();

		for (const c of get(credits)) {
			const rows = kind === 'voice'
				? c.actors.map((p) => ({ p, role: '' }))
				: c.staff.map((e) => ({ p: e.person, role: e.role }));

			const seen = new Set();

			for (const { p, role } of rows) {
				let r = m.get(p.id);

				if (!r) m.set(p.id, r = { id: p.id, name: p.name, image: p.image, n: 0, roles: [] });

				if (!seen.has(p.id)) {
					r.n++;
					seen.add(p.id);
				}

				if (role && !r.roles.includes(role) && r.roles.length < 2) r.roles.push(role);
			}
		}

		return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 60);
	}

	let people = user_derived(() => get(page) === 'voice' || get(page) === 'staff' ? rankPeople(get(page)) : []);

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

	var fragment = root_27();
	var node = first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root$7();
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
		var button = root_1$7();
		let classes;
		var text_2 = only_child(button, true);

		template_effect(() => {
			classes = set_class(button, 1, 'svelte-cjprq', null, classes, { on: get(page) === id() });
			set_text(text_2, label());
		});

		delegated('click', button, () => set(page, id(), true));
		append($$anchor, button);
	});

	var section = sibling(aside, 2);
	var node_2 = child(section);

	{
		var consequent_1 = ($$anchor) => {
			var div_3 = root_2$7();

			append($$anchor, div_3);
		};

		var consequent_7 = ($$anchor) => {
			var fragment_1 = root_14$2();
			var div_4 = first_child(fragment_1);
			var div_5 = child(div_4);
			var span = child(div_5);
			var text_3 = only_child(span, true);

			var div_6 = sibling(div_5, 2);
			var span_1 = child(div_6);
			var text_4 = only_child(span_1, true);

			var div_7 = sibling(div_6, 2);
			var span_2 = child(div_7);
			var text_5 = only_child(span_2, true);

			var div_8 = sibling(div_7, 2);
			var span_3 = child(div_8);
			var text_6 = only_child(span_3, true);

			var div_9 = sibling(div_8, 2);
			var span_4 = child(div_9);
			var text_7 = only_child(span_4, true);

			var div_10 = sibling(div_9, 2);
			var span_5 = child(div_10);
			var text_8 = only_child(span_5, true);

			var section_1 = sibling(div_4, 2);
			var div_11 = child(section_1);
			var div_12 = sibling(child(div_11), 2);
			var button_1 = child(div_12);
			let classes_1;
			var button_2 = sibling(button_1, 2);
			let classes_2;

			var div_13 = sibling(div_11, 2);

			each(div_13, 21, () => get(scoreData), index, ($$anchor, d) => {
				var div_14 = root_3$5();
				var div_15 = child(div_14);
				var span_6 = sibling(div_15, 2);
				var text_9 = only_child(span_6, true);

				template_effect(
					($0) => {
						set_style(div_15, `height:${get(d).v / get(maxScore) * 100}%`);
						set_attribute(div_15, 'title', `${get(d).s ?? ''}: ${$0 ?? ''}`);
						set_text(text_9, get(d).s);
					},
					[() => num(get(d).v)]
				);

				append($$anchor, div_14);
			});

			var section_2 = sibling(section_1, 2);
			var node_3 = sibling(child(section_2), 2);

			{
				var consequent_2 = ($$anchor) => {
					var div_16 = root_4$5();

					append($$anchor, div_16);
				};

				var alternate = ($$anchor) => {
					var div_17 = root_6$3();

					each(div_17, 21, () => get(epi), index, ($$anchor, $$item) => {
						var $$array = user_derived(() => to_array(get($$item), 2));
						let label = () => get($$array)[0];
						let v = () => get($$array)[1];
						var div_18 = root_5$3();
						var span_7 = child(div_18);
						var text_10 = only_child(span_7, true);
						var div_19 = sibling(span_7, 2);
						var div_20 = only_child(div_19);
						var span_8 = sibling(div_19, 2);
						var text_11 = only_child(span_8, true);

						template_effect(
							($0) => {
								set_text(text_10, label());
								set_style(div_20, `width:${v() / get(maxEpi) * 100}%`);
								set_text(text_11, $0);
							},
							[() => num(v())]
						);

						append($$anchor, div_18);
					});
					append($$anchor, div_17);
				};

				if_block(node_3, ($$render) => {
					if (get(epi).length === 0) $$render(consequent_2); else $$render(alternate, -1);
				});
			}

			var div_21 = sibling(section_2, 2);
			var section_3 = child(div_21);
			var node_4 = sibling(child(section_3), 2);

			{
				var consequent_3 = ($$anchor) => {
					var div_22 = root_4$5();

					append($$anchor, div_22);
				};

				var alternate_1 = ($$anchor) => {
					var div_23 = root_9$3();
					var svg = child(div_23);
					var node_5 = sibling(child(svg));

					each(node_5, 17, () => get(statusDonut), index, ($$anchor, s) => {
						var circle = root_7$3();
						var title = child(circle);
						var text_12 = only_child(title);

						template_effect(
							($0, $1) => {
								set_style(circle, `stroke:${get(s).color ?? ''}`);
								set_attribute(circle, 'stroke-dasharray', `${get(s).dash ?? ''} ${100 - get(s).dash}`);
								set_attribute(circle, 'stroke-dashoffset', get(s).offset);
								set_text(text_12, `${get(s).label ?? ''}: ${$0 ?? ''} (${$1 ?? ''}%)`);
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
						var li = root_8$3();
						var span_9 = child(li);
						var span_10 = sibling(span_9, 2);
						var text_13 = only_child(span_10, true);
						var span_11 = sibling(span_10, 2);
						var text_14 = only_child(span_11);

						template_effect(
							($0) => {
								set_style(span_9, `background:${get(s).color ?? ''}`);
								set_text(text_13, get(s).label);
								set_text(text_14, `${$0 ?? ''}%`);
							},
							[() => num(Math.round(get(s).pct * 10) / 10)]
						);

						append($$anchor, li);
					});
					append($$anchor, div_23);
				};

				if_block(node_4, ($$render) => {
					if (get(statusDonut).length === 0) $$render(consequent_3); else $$render(alternate_1, -1);
				});
			}

			var section_4 = sibling(section_3, 2);
			var node_6 = sibling(child(section_4), 2);

			{
				var consequent_4 = ($$anchor) => {
					var div_24 = root_4$5();

					append($$anchor, div_24);
				};

				var alternate_2 = ($$anchor) => {
					var div_25 = root_10$3();
					var svg_1 = child(div_25);
					var node_7 = sibling(child(svg_1));

					each(node_7, 17, () => get(formatDonut), index, ($$anchor, s) => {
						var circle_1 = root_7$3();
						var title_1 = child(circle_1);
						var text_15 = only_child(title_1);

						template_effect(
							($0, $1) => {
								set_style(circle_1, `stroke:${get(s).color ?? ''}`);
								set_attribute(circle_1, 'stroke-dasharray', `${get(s).dash ?? ''} ${100 - get(s).dash}`);
								set_attribute(circle_1, 'stroke-dashoffset', get(s).offset);
								set_text(text_15, `${get(s).label ?? ''}: ${$0 ?? ''} (${$1 ?? ''}%)`);
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
						var li_1 = root_8$3();
						var span_12 = child(li_1);
						var span_13 = sibling(span_12, 2);
						var text_16 = only_child(span_13, true);
						var span_14 = sibling(span_13, 2);
						var text_17 = only_child(span_14);

						template_effect(
							($0) => {
								set_style(span_12, `background:${get(s).color ?? ''}`);
								set_text(text_16, get(s).label);
								set_text(text_17, `${$0 ?? ''}%`);
							},
							[() => num(Math.round(get(s).pct * 10) / 10)]
						);

						append($$anchor, li_1);
					});
					append($$anchor, div_25);
				};

				if_block(node_6, ($$render) => {
					if (get(formatDonut).length === 0) $$render(consequent_4); else $$render(alternate_2, -1);
				});
			}

			var section_5 = sibling(div_21, 2);
			var node_8 = sibling(child(section_5), 2);

			{
				var consequent_5 = ($$anchor) => {
					var div_26 = root_4$5();

					append($$anchor, div_26);
				};

				var alternate_3 = ($$anchor) => {
					var div_27 = root_13$2();
					var svg_2 = child(div_27);

					set_attribute(svg_2, 'viewBox', '0 0 600 160');

					var polygon = child(svg_2);
					var polyline = sibling(polygon);
					var node_9 = sibling(polyline);

					each(node_9, 17, () => get(yearPts), index, ($$anchor, p) => {
						var circle_2 = root_11$3();
						var title_2 = child(circle_2);
						var text_18 = only_child(title_2);

						template_effect(
							($0) => {
								set_attribute(circle_2, 'cx', get(p).x);
								set_attribute(circle_2, 'cy', get(p).y);
								set_text(text_18, `${get(p).year ?? ''}: ${$0 ?? ''}`);
							},
							[() => num(get(p).count)]
						);

						append($$anchor, circle_2);
					});

					var div_28 = sibling(svg_2, 2);

					each(div_28, 21, () => get(yearPts), index, ($$anchor, p, i) => {
						var fragment_2 = comment();
						var node_10 = first_child(fragment_2);

						{
							var consequent_6 = ($$anchor) => {
								var span_15 = root_12$2();
								var text_19 = only_child(span_15, true);

								template_effect(() => {
									set_style(span_15, `left:${get(p).x / LW * 100}%`);
									set_text(text_19, get(p).year);
								});

								append($$anchor, span_15);
							};

							var d_1 = user_derived(() => get(years).length <= 14 || i === 0 || i === get(yearPts).length - 1 || i % Math.ceil(get(years).length / 10) === 0);

							if_block(node_10, ($$render) => {
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

				if_block(node_8, ($$render) => {
					if (get(years).length === 0) $$render(consequent_5); else $$render(alternate_3, -1);
				});
			}

			template_effect(
				($0, $1, $2, $3, $4, $5) => {
					set_text(text_3, $0);
					set_text(text_4, $1);
					set_text(text_5, $2);
					set_text(text_6, $3);
					set_text(text_7, $4);
					set_text(text_8, $5);
					classes_1 = set_class(button_1, 1, 'svelte-cjprq', null, classes_1, { on: get(scoreMode) === 'count' });
					classes_2 = set_class(button_2, 1, 'svelte-cjprq', null, classes_2, { on: get(scoreMode) === 'hours' });
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

			delegated('click', button_1, () => set(scoreMode, 'count'));
			delegated('click', button_2, () => set(scoreMode, 'hours'));
			append($$anchor, fragment_1);
		};

		var consequent_13 = ($$anchor) => {
			var fragment_3 = root_22();
			var div_29 = first_child(fragment_3);
			var h2 = child(div_29);
			var text_20 = only_child(h2, true);

			var node_11 = sibling(div_29, 2);

			{
				var consequent_8 = ($$anchor) => {
					var div_30 = root_15$2();
					var text_21 = only_child(div_30);

					template_effect(() => set_text(text_21, `lädt von AniList… ${get(credProg).done ?? ''} / ${get(credProg).total ?? ''} Titel`));
					append($$anchor, div_30);
				};

				var consequent_9 = ($$anchor) => {
					var div_31 = root_16$1();

					append($$anchor, div_31);
				};

				var consequent_10 = ($$anchor) => {
					var div_32 = root_17$1();

					append($$anchor, div_32);
				};

				var alternate_4 = ($$anchor) => {
					var fragment_4 = root_21();
					var div_33 = first_child(fragment_4);

					each(div_33, 23, () => get(people), (x) => x.id, ($$anchor, x, i) => {
						var div_34 = root_19();
						var div_35 = child(div_34);
						var span_16 = child(div_35);
						var text_22 = only_child(span_16);
						var span_17 = sibling(span_16, 2);
						var text_23 = only_child(span_17, true);

						var div_36 = sibling(div_35, 2);
						var div_37 = child(div_36);
						var span_18 = child(div_37);
						var text_24 = only_child(span_18, true);

						var node_12 = sibling(div_36, 2);

						{
							var consequent_11 = ($$anchor) => {
								var div_38 = root_18$1();
								var text_25 = only_child(div_38, true);

								template_effect(($0) => set_text(text_25, $0), [() => get(x).roles.join(' · ')]);
								append($$anchor, div_38);
							};

							if_block(node_12, ($$render) => {
								if (get(x).roles.length) $$render(consequent_11);
							});
						}

						template_effect(
							($0) => {
								set_text(text_22, `#${get(i) + 1}`);
								set_attribute(span_17, 'title', get(x).name);
								set_text(text_23, get(x).name);
								set_text(text_24, $0);
							},
							[() => num(get(x).n)]
						);

						append($$anchor, div_34);
					});

					var node_13 = sibling(div_33, 2);

					{
						var consequent_12 = ($$anchor) => {
							var p_2 = root_20();
							var text_26 = only_child(p_2);

							template_effect(() => set_text(text_26, `Teilweise geladen (${get(credProg).done ?? ''} / ${get(credProg).total ?? ''}) — AniList-Limit, beim nächsten Öffnen geht es weiter.`));
							append($$anchor, p_2);
						};

						if_block(node_13, ($$render) => {
							if (get(credProg).done < get(credProg).total) $$render(consequent_12);
						});
					}
					append($$anchor, fragment_4);
				};

				if_block(node_11, ($$render) => {
					if (get(credState) === 'loading') $$render(consequent_8); else if (get(credState) === 'error') $$render(consequent_9, 1); else if (get(people).length === 0) $$render(consequent_10, 2); else $$render(alternate_4, -1);
				});
			}

			template_effect(() => set_text(text_20, get(page) === 'voice' ? 'Sprecher (japanisch)' : 'Staff'));
			append($$anchor, fragment_3);
		};

		var alternate_6 = ($$anchor) => {
			const list = user_derived(() => get(page) === 'genres'
				? get(genres)
				: get(page) === 'studios' ? get(studios) : get(tags));

			var fragment_5 = root_26();
			var div_39 = first_child(fragment_5);
			var h2_1 = child(div_39);
			var text_27 = only_child(h2_1, true);
			var div_40 = sibling(h2_1, 2);

			each(div_40, 21, () => RANK, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let id = () => get($$array_1)[0];
				let label = () => get($$array_1)[1];
				var button_3 = root_1$7();
				let classes_3;
				var text_28 = only_child(button_3, true);

				template_effect(() => {
					classes_3 = set_class(button_3, 1, 'svelte-cjprq', null, classes_3, { on: get(rankBy) === id() });
					set_text(text_28, label());
				});

				delegated('click', button_3, () => set(rankBy, id(), true));
				append($$anchor, button_3);
			});

			var node_14 = sibling(div_39, 2);

			{
				var consequent_14 = ($$anchor) => {
					var div_41 = root_23();

					append($$anchor, div_41);
				};

				var alternate_5 = ($$anchor) => {
					var div_42 = root_25();

					each(div_42, 21, () => ranked(get(list)), index, ($$anchor, x, i) => {
						var div_43 = root_24();
						var div_44 = child(div_43);
						var span_19 = child(div_44);

						span_19.textContent = `#${i + 1}`;

						var span_20 = sibling(span_19, 2);
						var text_29 = only_child(span_20, true);

						var div_45 = sibling(div_44, 2);
						var div_46 = child(div_45);
						var span_21 = child(div_46);
						var text_30 = only_child(span_21, true);

						var div_47 = sibling(div_46, 2);
						var span_22 = child(div_47);
						var text_31 = only_child(span_22, true);

						var div_48 = sibling(div_47, 2);
						var span_23 = child(div_48);
						var text_32 = only_child(span_23, true);

						var div_49 = sibling(div_45, 2);
						var div_50 = only_child(div_49);
						var div_51 = sibling(div_49, 2);
						var text_33 = only_child(div_51, true);

						template_effect(
							($0, $1, $2, $3, $4) => {
								set_attribute(span_20, 'title', get(x).name);
								set_text(text_29, get(x).name);
								set_text(text_30, $0);
								set_text(text_31, $1);
								set_text(text_32, $2);
								set_style(div_50, `width:${$3 ?? ''}%`);
								set_text(text_33, $4);
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

						append($$anchor, div_43);
					});
					append($$anchor, div_42);
				};

				if_block(node_14, ($$render) => {
					if (get(list).length === 0) $$render(consequent_14); else $$render(alternate_5, -1);
				});
			}

			template_effect(() => set_text(text_27, get(page) === 'genres'
				? 'Genres'
				: get(page) === 'studios' ? 'Studios' : 'Tags'));

			append($$anchor, fragment_5);
		};

		if_block(node_2, ($$render) => {
			if (!get(stats)) $$render(consequent_1); else if (get(page) === 'overview') $$render(consequent_7, 1); else if (get(page) === 'voice' || get(page) === 'staff') $$render(consequent_13, 2); else $$render(alternate_6, -1);
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

var root$6 = from_html(`<button title="KI-Suche über den Inhalt">KI</button>`);
var root_1$6 = from_html(`<div class="panel-empty svelte-1mrhfs9">Keine Genres</div>`);
var root_2$6 = from_html(`<button><span class="tick svelte-1mrhfs9"> </span> </button>`);
var root_3$4 = from_html(`<div class="panel-empty svelte-1mrhfs9">Tags</div> <!>`, 1);
var root_4$4 = from_html(`<!> <!>`, 1);
var root_5$2 = from_html(`<div class="panel scroll svelte-1mrhfs9"><!></div>`);
var root_6$2 = from_html(`<div class="panel scroll svelte-1mrhfs9"><button><span class="tick svelte-1mrhfs9"> </span>Alle</button> <!></div>`);
var root_7$2 = from_html(`<div class="panel svelte-1mrhfs9"><button><span class="tick svelte-1mrhfs9"> </span>Alle</button> <!></div>`);
var root_8$2 = from_html(`<div class="panel svelte-1mrhfs9"></div>`);
var root_9$2 = from_html(`<div class="state svelte-1mrhfs9">lädt…</div>`);
var root_10$2 = from_html(`<div class="state svelte-1mrhfs9">Nichts gefunden.</div>`);
var root_11$2 = from_html(`<div class="grid svelte-1mrhfs9"></div>`);
var root_12$1 = from_html(`<section class="result svelte-1mrhfs9"><div class="result-head svelte-1mrhfs9"><h2 class="svelte-1mrhfs9">Ergebnisse<!></h2> <button class="all svelte-1mrhfs9">Filter zurücksetzen</button></div> <!></section>`);
var root_13$1 = from_html(`<div class="state svelte-1mrhfs9">Noch nichts zu entdecken — importiere Titel über die Einstellungen.</div>`);
var root_14$1 = from_html(`<section class="row svelte-1mrhfs9"><div class="head svelte-1mrhfs9"><h2 class="svelte-1mrhfs9"> </h2> <button class="all svelte-1mrhfs9">Alle ansehen</button></div> <div class="grid svelte-1mrhfs9"></div></section>`);
var root_15$1 = from_html(`<div class="browse svelte-1mrhfs9"><div class="filterbar svelte-1mrhfs9"><div class="field search svelte-1mrhfs9"><label for="browse-search" class="svelte-1mrhfs9">Suche</label> <div class="searchbox svelte-1mrhfs9"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="svelte-1mrhfs9"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg> <input id="browse-search" type="text" class="svelte-1mrhfs9"/> <!></div></div> <div class="field svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Genres &amp; Tags</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Jahr</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Saison</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Format</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Synchro-Sprache</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Gesehen</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Airing-Status</span> <button class="drop disabled svelte-1mrhfs9" disabled="" title="Noch keine Daten importiert"><span class="val svelte-1mrhfs9">🔒 Alle</span> <i class="arr svelte-1mrhfs9">▾</i></button></div> <div class="field narrow svelte-1mrhfs9"><span class="lbl svelte-1mrhfs9">Sortierung</span> <button><span class="val svelte-1mrhfs9"> </span> <i class="arr svelte-1mrhfs9">▾</i></button> <!></div></div> <!></div>`);

const $$css$6 = {
	hash: 'svelte-1mrhfs9',
	code: '.browse.svelte-1mrhfs9 {max-width:var(--maxw);margin:0 auto;padding:24px var(--pad) 48px;display:flex;flex-direction:column;gap:34px;}\n\n  /* ---- Filterleiste ---- */.filterbar.svelte-1mrhfs9 {display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px;}.field.svelte-1mrhfs9 {position:relative;display:flex;flex-direction:column;gap:4px;min-width:130px;}.field.narrow.svelte-1mrhfs9 {min-width:110px;}.field.search.svelte-1mrhfs9 {flex:1 1 220px;min-width:180px;}.field.svelte-1mrhfs9 label:where(.svelte-1mrhfs9),\n  .lbl.svelte-1mrhfs9 {font-size:0.72rem;font-weight:600;color:var(--text-muted);padding-left:2px;}.searchbox.svelte-1mrhfs9 {display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0 10px;height:38px;transition:border-color 0.15s ease;}.searchbox.svelte-1mrhfs9:focus-within {border-color:var(--accent);}.searchbox.svelte-1mrhfs9 svg:where(.svelte-1mrhfs9) {width:16px;height:16px;color:var(--text-muted);flex:0 0 auto;}.searchbox.svelte-1mrhfs9 input:where(.svelte-1mrhfs9) {border:0;background:none;outline:none;color:var(--text-strong);font-family:inherit;font-size:0.86rem;width:100%;}.searchbox.svelte-1mrhfs9 input:where(.svelte-1mrhfs9)::placeholder {color:var(--text-muted);}.searchbox.svelte-1mrhfs9 .ki:where(.svelte-1mrhfs9) {flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--radius-sm);padding:3px 9px;font-size:0.74rem;font-weight:700;cursor:pointer;}.searchbox.svelte-1mrhfs9 .ki.on:where(.svelte-1mrhfs9) {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.drop.svelte-1mrhfs9 {display:flex;align-items:center;justify-content:space-between;gap:8px;height:38px;width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:0 10px;color:var(--text);font-size:0.86rem;cursor:pointer;transition:border-color 0.15s ease, color 0.15s ease;}.drop.svelte-1mrhfs9:hover:not(.disabled) {border-color:var(--accent);}.drop.filled.svelte-1mrhfs9 {color:var(--text-strong);border-color:var(--accent);}.drop.svelte-1mrhfs9 .val:where(.svelte-1mrhfs9) {overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}.drop.svelte-1mrhfs9 .arr:where(.svelte-1mrhfs9) {font-style:normal;font-size:0.7rem;color:var(--text-muted);flex:0 0 auto;}.drop.disabled.svelte-1mrhfs9 {cursor:not-allowed;opacity:0.55;}.panel.svelte-1mrhfs9 {position:absolute;top:calc(100% + 4px);left:0;min-width:100%;max-width:260px;z-index:30;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:4px;display:flex;flex-direction:column;gap:1px;}.panel.scroll.svelte-1mrhfs9 {max-height:280px;overflow-y:auto;}.panel-empty.svelte-1mrhfs9 {padding:8px 10px;font-size:0.8rem;color:var(--text-muted);}.opt.svelte-1mrhfs9 {display:flex;align-items:center;gap:6px;border:0;background:none;color:var(--text);font-size:0.84rem;text-align:left;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;white-space:nowrap;transition:background 0.12s ease, color 0.12s ease;}.opt.svelte-1mrhfs9:hover {background:var(--surface-2);}.opt.sel.svelte-1mrhfs9 {color:var(--accent);font-weight:600;}.opt.svelte-1mrhfs9 .tick:where(.svelte-1mrhfs9) {width:12px;flex:0 0 auto;color:var(--accent);font-size:0.78rem;}\n\n  /* ---- Reihen / Raster ---- */.row.svelte-1mrhfs9,\n  .result.svelte-1mrhfs9 {display:flex;flex-direction:column;gap:14px;}.head.svelte-1mrhfs9,\n  .result-head.svelte-1mrhfs9 {display:flex;align-items:baseline;justify-content:space-between;gap:12px;}.head.svelte-1mrhfs9 h2:where(.svelte-1mrhfs9),\n  .result-head.svelte-1mrhfs9 h2:where(.svelte-1mrhfs9) {margin:0;font-size:0.82rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-strong);}.all.svelte-1mrhfs9 {border:0;background:none;color:var(--text-muted);font-size:0.78rem;cursor:pointer;padding:0;transition:color 0.15s ease;}.all.svelte-1mrhfs9:hover {color:var(--accent);}.grid.svelte-1mrhfs9 {display:grid;grid-template-columns:repeat(6, 1fr);gap:20px 22px;}.state.svelte-1mrhfs9 {padding:48px 0;text-align:center;color:var(--text-muted);font-size:0.9rem;}\n\n  @media (max-width: 980px) {.browse.svelte-1mrhfs9 {padding:20px 24px 40px;}.grid.svelte-1mrhfs9 {grid-template-columns:repeat(4, 1fr);}\n  }\n  @media (max-width: 640px) {.grid.svelte-1mrhfs9 {grid-template-columns:repeat(3, 1fr);gap:16px 14px;}.field.search.svelte-1mrhfs9 {flex-basis:100%;}\n  }'
};

function Browse($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$6);

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
			var button = root$6();
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
			var div_5 = root_5$2();
			var node_2 = child(div_5);

			{
				var consequent_1 = ($$anchor) => {
					var div_6 = root_1$6();

					append($$anchor, div_6);
				};

				var alternate = ($$anchor) => {
					var fragment = root_4$4();
					var node_3 = first_child(fragment);

					each(node_3, 17, () => get(meta).genres, index, ($$anchor, g) => {
						var button_2 = root_2$6();
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
								var button_3 = root_2$6();
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
			var div_8 = root_6$2();
			var button_5 = child(div_8);
			let classes_5;
			var span_4 = child(button_5);
			var text_6 = only_child(span_4, true);

			var node_7 = sibling(button_5, 2);

			each(node_7, 17, () => get(years), index, ($$anchor, y) => {
				var button_6 = root_2$6();
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
				var button_9 = root_2$6();
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
				var button_12 = root_2$6();
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
			var div_14 = root_6$2();
			var button_14 = child(div_14);
			let classes_14;
			var span_13 = child(button_14);
			var text_18 = only_child(span_13, true);

			var node_13 = sibling(button_14, 2);

			each(node_13, 17, () => DUB_LANGS, index, ($$anchor, $$item) => {
				var $$array_1 = user_derived(() => to_array(get($$item), 2));
				let v = () => get($$array_1)[0];
				let l = () => get($$array_1)[1];
				var button_15 = root_2$6();
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
				var button_17 = root_2$6();
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
				var button_19 = root_2$6();
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

var root$5 = from_html(`<li><button class="feedrow svelte-mqnx2g"><span class="fstatus svelte-mqnx2g"> </span> <span class="ftitle svelte-mqnx2g"> </span></button></li>`);
var root_1$5 = from_html(`<ul class="feed svelte-mqnx2g"></ul>`);
var root_2$5 = from_html(`<p class="empty svelte-mqnx2g">Noch keine Einträge.</p>`);
var root_3$3 = from_html(`<div class="ip svelte-mqnx2g"><button class="ipcover svelte-mqnx2g"><!> <div class="ipfoot svelte-mqnx2g"><span class="prog svelte-mqnx2g"> <!></span></div></button> <button class="plus svelte-mqnx2g" title="Eine Folge weiter">+</button> <div class="iptitle svelte-mqnx2g"> </div></div>`);
var root_4$3 = from_html(`<div class="ipgrid svelte-mqnx2g"></div>`);
var root_5$1 = from_html(`<p class="empty svelte-mqnx2g">Nichts in Bearbeitung.</p>`);
var root_6$1 = from_html(`<p class="empty svelte-mqnx2g">lädt Ausstrahlungstermine…</p>`);
var root_7$1 = from_html(`<p class="empty svelte-mqnx2g">Keine Termine — „Beobachten“-Titel mit laufender Ausstrahlung erscheinen hier (Daten: AniList).</p>`);
var root_8$1 = from_html(`<div class="cell svelte-mqnx2g"><!></div>`);
var root_9$1 = from_html(`<section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Trending</h2></div> <div class="strip svelte-mqnx2g"></div></section>`);
var root_10$1 = from_html(`<section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Neu hinzugefügt</h2></div> <div class="strip svelte-mqnx2g"></div></section>`);
var root_11$1 = from_html(`<div class="home svelte-mqnx2g"><aside class="left svelte-mqnx2g"><h2 class="svelte-mqnx2g">Zuletzt aktualisiert</h2> <!></aside> <div class="right svelte-mqnx2g"><section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">In Bearbeitung</h2></div> <!></section> <section class="block svelte-mqnx2g"><div class="head svelte-mqnx2g"><h2 class="svelte-mqnx2g">Demnächst</h2></div> <!></section> <!> <!></div></div>`);

const $$css$5 = {
	hash: 'svelte-mqnx2g',
	code: '.home.svelte-mqnx2g {max-width:var(--maxw);margin:0 auto;padding:24px var(--pad) 60px;display:grid;grid-template-columns:300px 1fr;gap:30px;align-items:start;}h2.svelte-mqnx2g {margin:0;font-size:0.85rem;font-weight:600;color:var(--text-muted);}\n\n  /* Linke Spalte */.left.svelte-mqnx2g {min-width:0;}.left.svelte-mqnx2g h2:where(.svelte-mqnx2g) {margin-bottom:10px;}.feed.svelte-mqnx2g {list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;}.feedrow.svelte-mqnx2g {width:100%;display:flex;flex-direction:column;gap:2px;text-align:left;border:0;background:none;color:inherit;cursor:pointer;padding:8px 10px;border-radius:var(--radius);transition:background 0.15s ease;}.feedrow.svelte-mqnx2g:hover {background:var(--surface-2);}.fstatus.svelte-mqnx2g {font-size:0.72rem;font-weight:600;color:var(--accent);}.ftitle.svelte-mqnx2g {font-size:0.84rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.empty.svelte-mqnx2g {color:var(--text-muted);font-size:0.82rem;padding:4px 2px;}\n\n  /* Rechte Spalte */.right.svelte-mqnx2g {min-width:0;display:flex;flex-direction:column;gap:34px;}.block.svelte-mqnx2g {display:flex;flex-direction:column;gap:12px;}.head.svelte-mqnx2g {display:flex;align-items:baseline;justify-content:space-between;gap:12px;}\n\n  /* In-Bearbeitung-Raster mit +1-Button */.ipgrid.svelte-mqnx2g {display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:20px 16px;}.ip.svelte-mqnx2g {display:flex;flex-direction:column;gap:7px;position:relative;min-width:0;}.ipcover.svelte-mqnx2g {position:relative;width:100%;aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;border:0;padding:0;background:var(--surface);box-shadow:var(--shadow-sm);cursor:pointer;transition:transform 0.18s ease, box-shadow 0.18s ease;}.ip.svelte-mqnx2g:hover .ipcover:where(.svelte-mqnx2g) {transform:translateY(-2px);box-shadow:var(--shadow);}.ipfoot.svelte-mqnx2g {position:absolute;left:0;right:0;bottom:0;padding:5px 7px;background:linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));display:flex;justify-content:flex-start;}.prog.svelte-mqnx2g {font-size:0.72rem;font-weight:600;color:#fff;}.plus.svelte-mqnx2g {position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:var(--radius-sm);border:0;background:var(--accent);color:var(--on-accent);font-size:1.05rem;line-height:1;font-weight:700;cursor:pointer;opacity:0;transition:opacity 0.15s ease, filter 0.15s ease;}.ip.svelte-mqnx2g:hover .plus:where(.svelte-mqnx2g) {opacity:1;}.plus.svelte-mqnx2g:hover {filter:brightness(1.1);}.iptitle.svelte-mqnx2g {font-size:0.8rem;line-height:1.3;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}\n\n  /* Trending / Neu — Cover-Streifen */.strip.svelte-mqnx2g {display:flex;gap:20px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity;scrollbar-width:thin;}.cell.svelte-mqnx2g {flex:0 0 auto;width:140px;scroll-snap-align:start;}\n\n  @media (max-width: 860px) {.home.svelte-mqnx2g {grid-template-columns:1fr;gap:24px;}\n  }\n  @media (max-width: 760px) {.home.svelte-mqnx2g {padding:20px 20px 50px;}.cell.svelte-mqnx2g {width:120px;}\n  }\n  /* Touch-Geräte: +1 immer sichtbar (kein Hover) */\n  @media (hover: none) {.plus.svelte-mqnx2g {opacity:1;}\n  }'
};

function Home($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$5);

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

	// Demnächst: nächste Folge der laufenden Titel (AniList, Laufzeit-Abruf)
	let airing = state(proxy([]));

	let airingState = state('idle');

	async function loadAiring(list) {
		const withId = list.filter((m) => m.anilist_id);

		if (!withId.length) {
			set(airing, [], true);
			set(airingState, 'done');

			return;
		}

		set(airingState, 'loading');

		const a = await getAiring(withId.map((m) => m.anilist_id));
		const byId = new Map(withId.map((m) => [m.anilist_id, m]));

		set(airing, a.filter((x) => byId.has(x.id)).map((x) => ({ ...x, m: byId.get(x.id) })), true);
		set(airingState, 'done');
	}

	function inTime(at) {
		const s = at - Date.now() / 1000;

		if (s <= 0) return 'jetzt';

		const d = Math.floor(s / 86400),
			h = Math.floor(s % 86400 / 3600),
			min = Math.floor(s % 3600 / 60);

		return d > 0
			? `in ${d} T ${h} Std`
			: h > 0 ? `in ${h} Std ${min} Min` : `in ${min} Min`;
	}

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
		loadAiring(ip);
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
	var node = sibling(child(aside), 2);

	{
		var consequent = ($$anchor) => {
			var ul = root_1$5();

			each(ul, 21, () => get(activity), (m) => m.id, ($$anchor, m) => {
				var li = root$5();
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
			var p = root_2$5();

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
		var consequent_2 = ($$anchor) => {
			var div_2 = root_4$3();

			each(div_2, 21, () => get(inProgress), (m) => m.id, ($$anchor, m) => {
				var div_3 = root_3$3();
				var button_1 = child(div_3);
				var node_2 = child(button_1);

				Cover(node_2, {
					get media() {
						return get(m);
					}
				});

				var div_4 = sibling(node_2, 2);
				var span_2 = child(div_4);
				var text_2 = child(span_2);
				var node_3 = sibling(text_2);

				{
					var consequent_1 = ($$anchor) => {
						var text_3 = text();

						template_effect(() => set_text(text_3, `/ ${get(m).episodes ?? ''}`));
						append($$anchor, text_3);
					};

					if_block(node_3, ($$render) => {
						if (get(m).episodes) $$render(consequent_1);
					});
				}

				var button_2 = sibling(button_1, 2);
				var div_5 = sibling(button_2, 2);
				var text_4 = only_child(div_5, true);

				template_effect(() => {
					set_attribute(button_1, 'title', get(m).title);
					set_text(text_2, get(m).progress ?? 0);
					set_text(text_4, get(m).title);
				});

				delegated('click', button_1, () => $$props.onopen(get(m)));
				delegated('click', button_2, (e) => bump(get(m), e));
				append($$anchor, div_3);
			});
			append($$anchor, div_2);
		};

		var alternate_1 = ($$anchor) => {
			var p_1 = root_5$1();

			append($$anchor, p_1);
		};

		if_block(node_1, ($$render) => {
			if (get(inProgress).length) $$render(consequent_2); else $$render(alternate_1, -1);
		});
	}

	var section_1 = sibling(section, 2);
	var node_4 = sibling(child(section_1), 2);

	{
		var consequent_3 = ($$anchor) => {
			var ul_1 = root_1$5();

			each(ul_1, 21, () => get(airing), (a) => a.id, ($$anchor, a) => {
				var li_1 = root$5();
				var button_3 = child(li_1);
				var span_3 = child(button_3);
				var text_5 = only_child(span_3);
				var span_4 = sibling(span_3, 2);
				var text_6 = only_child(span_4, true);

				template_effect(
					($0) => {
						set_text(text_5, `Folge ${get(a).episode ?? ''} · ${$0 ?? ''}`);
						set_text(text_6, get(a).m.title);
					},
					[() => inTime(get(a).at)]
				);

				delegated('click', button_3, () => $$props.onopen(get(a).m));
				append($$anchor, li_1);
			});
			append($$anchor, ul_1);
		};

		var consequent_4 = ($$anchor) => {
			var p_2 = root_6$1();

			append($$anchor, p_2);
		};

		var alternate_2 = ($$anchor) => {
			var p_3 = root_7$1();

			append($$anchor, p_3);
		};

		if_block(node_4, ($$render) => {
			if (get(airing).length) $$render(consequent_3); else if (get(airingState) === 'loading') $$render(consequent_4, 1); else $$render(alternate_2, -1);
		});
	}

	var node_5 = sibling(section_1, 2);

	{
		var consequent_5 = ($$anchor) => {
			var section_2 = root_9$1();
			var div_6 = sibling(child(section_2), 2);

			each(div_6, 21, () => get(trending), (m) => m.id, ($$anchor, m) => {
				var div_7 = root_8$1();
				var node_6 = child(div_7);

				Card(node_6, {
					get media() {
						return get(m);
					},

					get onopen() {
						return $$props.onopen;
					}
				});
				append($$anchor, div_7);
			});
			append($$anchor, section_2);
		};

		if_block(node_5, ($$render) => {
			if (get(trending).length) $$render(consequent_5);
		});
	}

	var node_7 = sibling(node_5, 2);

	{
		var consequent_6 = ($$anchor) => {
			var section_3 = root_10$1();
			var div_8 = sibling(child(section_3), 2);

			each(div_8, 21, () => get(newlyAdded), (m) => m.id, ($$anchor, m) => {
				var div_9 = root_8$1();
				var node_8 = child(div_9);

				Card(node_8, {
					get media() {
						return get(m);
					},

					get onopen() {
						return $$props.onopen;
					}
				});
				append($$anchor, div_9);
			});
			append($$anchor, section_3);
		};

		if_block(node_7, ($$render) => {
			if (get(newlyAdded).length) $$render(consequent_6);
		});
	}
	append($$anchor, div);
	pop();
}

delegate(['click']);

var root$4 = from_html(`<button><span> </span><i class="svelte-1nyrbv3"> </i></button>`);
var root_1$4 = from_html(`<button title="KI-Suche über den Inhalt">KI</button>`);
var root_2$4 = from_html(`<button class="reset svelte-1nyrbv3">Zurücksetzen</button>`);
var root_3$2 = from_html(`<button> </button>`);
var root_4$2 = from_html(`<div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Format</span> <div class="chips svelte-1nyrbv3"></div></div>`);
var root_5 = from_html(`<div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Genres</span> <div class="chips svelte-1nyrbv3"></div></div>`);
var root_6 = from_html(`<option> </option>`);
var root_7 = from_html(`<div class="placeholder svelte-1nyrbv3">lädt Liste…</div>`);
var root_8 = from_html(`<div class="placeholder svelte-1nyrbv3">Noch keine Einträge in dieser Liste.</div>`);
var root_9 = from_html(`<div class="sec-head svelte-1nyrbv3"><h2 class="svelte-1nyrbv3"> </h2> <span class="sec-count svelte-1nyrbv3"> </span></div>`);
var root_10 = from_html(`<div class="cards svelte-1nyrbv3"></div>`);
var root_11 = from_html(`<div class="row head svelte-1nyrbv3"><span class="c-title svelte-1nyrbv3">Titel</span> <span class="c-score svelte-1nyrbv3">Punktzahl</span> <span class="c-prog svelte-1nyrbv3">Fortschritt</span> <span class="c-type svelte-1nyrbv3">Typ</span></div>`);
var root_12 = from_html(`<span class="cover svelte-1nyrbv3"><!></span>`);
var root_13 = from_html(`<span class="dot svelte-1nyrbv3"></span>`);
var root_14 = from_html(`<span class="svcchip svelte-1nyrbv3"> </span>`);
var root_15 = from_html(`<button class="row svelte-1nyrbv3"><span class="c-title svelte-1nyrbv3"><!> <!> <span class="tname svelte-1nyrbv3"> </span> <!></span> <span class="c-score svelte-1nyrbv3"> </span> <span class="c-prog svelte-1nyrbv3"> </span> <span class="c-type svelte-1nyrbv3"> </span></button>`);
var root_16 = from_html(`<div><!> <!></div>`);
var root_17 = from_html(`<div class="section svelte-1nyrbv3"><!> <!></div>`);
var root_18 = from_html(`<div class="list-view svelte-1nyrbv3"><aside class="sidebar svelte-1nyrbv3"><nav class="lists svelte-1nyrbv3"><button><span>Alle</span><i class="svelte-1nyrbv3"> </i></button> <!></nav> <div class="filterbox svelte-1nyrbv3"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-1nyrbv3"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4-4"></path></svg> <input class="svelte-1nyrbv3"/> <!> <button aria-label="Filter ein-/ausklappen"><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1nyrbv3"><path d="M3 5h18l-7 8v6l-4-2v-4z"></path></svg></button></div> <div><div class="fhd svelte-1nyrbv3"><span class="svelte-1nyrbv3">Filter</span> <!></div> <!> <!> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Synchro-Sprache</span> <div class="chips svelte-1nyrbv3"></div></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Punktzahl</span> <select class="svelte-1nyrbv3"><option>Alle Punkte</option><!></select></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Jahr</span> <div class="years svelte-1nyrbv3"><input type="number" class="svelte-1nyrbv3"/> <span class="dash svelte-1nyrbv3">–</span> <input type="number" class="svelte-1nyrbv3"/></div></div> <div class="grp svelte-1nyrbv3"><span class="glabel svelte-1nyrbv3">Sortieren</span> <select class="svelte-1nyrbv3"><option>Titel A–Z</option><option>Wertung</option><option>Beliebtheit</option><option>Zuletzt aktualisiert</option></select></div></div></div></aside> <section class="main svelte-1nyrbv3"><div class="toolbar svelte-1nyrbv3"><div class="view-toggle svelte-1nyrbv3"></div></div> <!></section></div>`);

const $$css$4 = {
	hash: 'svelte-1nyrbv3',
	code: '.list-view.svelte-1nyrbv3 {max-width:var(--maxw);margin:0 auto;padding:24px 20px 60px;display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start;}\n\n  /* ── Sidebar ── */.sidebar.svelte-1nyrbv3 {position:sticky;top:70px;display:flex;flex-direction:column;gap:16px;\n    /* Kategorien (oben) bleiben IMMER sichtbar; nur die Filterbox scrollt intern. */max-height:calc(100vh - 86px);}.lists.svelte-1nyrbv3 {flex:0 0 auto;}.filterbox.svelte-1nyrbv3 {flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}.filterbox.svelte-1nyrbv3::-webkit-scrollbar {width:8px;}.lists.svelte-1nyrbv3 {display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden;}.list-item.svelte-1nyrbv3 {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 14px;border:0;background:none;color:var(--text);cursor:pointer;font-size:0.88rem;font-weight:500;text-align:left;transition:background 0.12s, color 0.12s;}.list-item.svelte-1nyrbv3:hover {background:var(--surface-2);}.list-item.on.svelte-1nyrbv3 {background:var(--surface-2);color:var(--accent);font-weight:600;}.list-item.svelte-1nyrbv3 i:where(.svelte-1nyrbv3) {font-style:normal;font-size:0.78rem;font-weight:700;color:var(--text-muted);}.list-item.on.svelte-1nyrbv3 i:where(.svelte-1nyrbv3) {color:var(--accent);}.filterbox.svelte-1nyrbv3 {background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:14px 15px;}.search.svelte-1nyrbv3 {display:flex;align-items:center;gap:7px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0 10px;margin-bottom:14px;}.search.ai.svelte-1nyrbv3 {border-color:var(--accent);}.search.svelte-1nyrbv3 svg:where(.svelte-1nyrbv3) {width:15px;height:15px;color:var(--text-muted);flex:0 0 auto;}.search.svelte-1nyrbv3 input:where(.svelte-1nyrbv3) {flex:1;min-width:0;border:0;background:none;color:var(--text);padding:8px 0;outline:none;font-size:0.84rem;}.search.svelte-1nyrbv3 .ki:where(.svelte-1nyrbv3) {flex:0 0 auto;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:var(--radius-sm);padding:3px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;}.search.svelte-1nyrbv3 .ki.on:where(.svelte-1nyrbv3) {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.fhd.svelte-1nyrbv3 {display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}.fhd.svelte-1nyrbv3 span:where(.svelte-1nyrbv3) {font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;color:var(--text-muted);}.reset.svelte-1nyrbv3 {background:none;border:0;color:var(--text-muted);cursor:pointer;font-size:0.74rem;padding:0;}.reset.svelte-1nyrbv3:hover {color:var(--accent);}.grp.svelte-1nyrbv3 {margin-bottom:14px;}.grp.svelte-1nyrbv3:last-child {margin-bottom:0;}.glabel.svelte-1nyrbv3 {display:block;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:var(--text-muted);margin-bottom:7px;}.chips.svelte-1nyrbv3 {display:flex;flex-wrap:wrap;gap:5px;}.chip.svelte-1nyrbv3 {padding:5px 10px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:0.76rem;font-weight:500;line-height:1.2;white-space:nowrap;transition:background 0.12s, color 0.12s, border-color 0.12s;}.chip.svelte-1nyrbv3:hover {border-color:var(--accent);color:var(--accent);}.chip.on.svelte-1nyrbv3 {background:var(--accent);color:var(--on-accent);border-color:var(--accent);}.chip.on.svelte-1nyrbv3:hover {color:var(--on-accent);}.years.svelte-1nyrbv3 {display:flex;align-items:center;gap:7px;}.years.svelte-1nyrbv3 input:where(.svelte-1nyrbv3) {width:100%;min-width:0;}.dash.svelte-1nyrbv3 {color:var(--text-muted);}input[type=\'number\'].svelte-1nyrbv3, select.svelte-1nyrbv3 {padding:7px 9px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:0.8rem;font-family:inherit;}input[type=\'number\'].svelte-1nyrbv3:focus, select.svelte-1nyrbv3:focus {outline:none;border-color:var(--accent);}select.svelte-1nyrbv3 {width:100%;cursor:pointer;}\n\n  /* ── Hauptbereich ── */.main.svelte-1nyrbv3 {min-width:0;}.toolbar.svelte-1nyrbv3 {display:flex;justify-content:flex-end;margin-bottom:16px;}.view-toggle.svelte-1nyrbv3 {display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:3px;}.view-toggle.svelte-1nyrbv3 button:where(.svelte-1nyrbv3) {width:32px;height:30px;border:0;border-radius:var(--radius-sm);background:none;color:var(--text-muted);cursor:pointer;font-size:1rem;line-height:1;display:grid;place-items:center;transition:background 0.12s, color 0.12s;}.view-toggle.svelte-1nyrbv3 button:where(.svelte-1nyrbv3):hover {color:var(--text);}.view-toggle.svelte-1nyrbv3 button.on:where(.svelte-1nyrbv3) {background:var(--accent);color:var(--on-accent);}.section.svelte-1nyrbv3 {margin-bottom:28px;}.sec-head.svelte-1nyrbv3 {display:flex;align-items:baseline;gap:10px;margin-bottom:10px;}.sec-head.svelte-1nyrbv3 h2:where(.svelte-1nyrbv3) {margin:0;font-size:0.95rem;font-weight:600;color:var(--text-strong);}.sec-count.svelte-1nyrbv3 {font-size:0.78rem;color:var(--text-muted);font-weight:600;}\n\n  /* ── Tabelle ── */.table.svelte-1nyrbv3 {display:flex;flex-direction:column;gap:8px;}.row.svelte-1nyrbv3 {display:grid;grid-template-columns:1fr 90px 100px 110px;align-items:center;gap:12px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:8px 14px;color:var(--text);cursor:pointer;font:inherit;transition:background 0.12s, transform 0.12s;}.row.svelte-1nyrbv3:hover {background:var(--surface-2);}.row.head.svelte-1nyrbv3 {background:none;border:0;box-shadow:none;padding:0 14px 4px;cursor:default;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:var(--text-muted);}.c-title.svelte-1nyrbv3 {display:flex;align-items:center;gap:12px;min-width:0;}.svcchip.svelte-1nyrbv3 {flex:0 0 auto;margin-left:6px;padding:1px 7px;border-radius:999px;font-size:0.68rem;background:var(--surface-2);color:var(--text-muted);border:1px solid var(--border);white-space:nowrap;}.cover.svelte-1nyrbv3 {position:relative;flex:0 0 auto;width:40px;aspect-ratio:185 / 265;border-radius:var(--radius-sm);overflow:hidden;background:var(--surface-2);}.dot.svelte-1nyrbv3 {flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:var(--good);box-shadow:0 0 0 2px color-mix(in srgb, var(--good) 30%, transparent);}.tname.svelte-1nyrbv3 {min-width:0;font-size:0.88rem;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.row.svelte-1nyrbv3:hover .tname:where(.svelte-1nyrbv3) {color:var(--accent);}.c-score.svelte-1nyrbv3 {color:var(--good);font-weight:600;font-size:0.86rem;text-align:center;}.c-prog.svelte-1nyrbv3 {color:var(--text);font-size:0.84rem;text-align:center;}.c-type.svelte-1nyrbv3 {color:var(--text-muted);font-size:0.82rem;text-align:center;}\n\n  /* Kompakte Zeilen: ohne Cover, dichter, einzeilige Pillen */.table.compact.svelte-1nyrbv3 {gap:3px;}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3) {grid-template-columns:1fr 70px 90px 100px;padding:7px 14px;box-shadow:none;border-color:transparent;border-radius:var(--radius-sm);background:none;}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3):nth-child(odd) {background:var(--surface);}.table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3):hover {background:var(--surface-2);}\n\n  /* ── Karten ── */.cards.svelte-1nyrbv3 {display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:18px;}.placeholder.svelte-1nyrbv3 {text-align:center;color:var(--text-muted);padding:60px 0;font-size:0.9rem;}.ftoggle.svelte-1nyrbv3 {display:none;}\n  @media (max-width: 760px) {.ftoggle.svelte-1nyrbv3 {display:grid;place-items:center;width:30px;height:28px;border:0;background:none;color:var(--text-muted);cursor:pointer;}.ftoggle.svelte-1nyrbv3 svg:where(.svelte-1nyrbv3) {width:17px;height:17px;}.ftoggle.on.svelte-1nyrbv3 {color:var(--accent);}.fbody.closed.svelte-1nyrbv3 {display:none;}.list-view.svelte-1nyrbv3 {grid-template-columns:1fr;gap:16px;}.sidebar.svelte-1nyrbv3 {position:static;}.lists.svelte-1nyrbv3 {flex-direction:row;flex-wrap:wrap;}.list-item.svelte-1nyrbv3 {flex:1 0 auto;}.row.svelte-1nyrbv3, .table.compact.svelte-1nyrbv3 .row:where(.svelte-1nyrbv3) {grid-template-columns:1fr 44px 58px;gap:8px;padding:8px 10px;}.row.head.svelte-1nyrbv3 {font-size:0.6rem;letter-spacing:0;padding:0 10px 4px;}.row.head.svelte-1nyrbv3 .c-score:where(.svelte-1nyrbv3), .row.head.svelte-1nyrbv3 .c-prog:where(.svelte-1nyrbv3) {font-size:0;}.row.head.svelte-1nyrbv3 .c-score:where(.svelte-1nyrbv3)::after {content:\'★\';font-size:0.75rem;}.row.head.svelte-1nyrbv3 .c-prog:where(.svelte-1nyrbv3)::after {content:\'Ep.\';font-size:0.6rem;}.tname.svelte-1nyrbv3 {white-space:normal !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.filterbox.svelte-1nyrbv3 {padding:8px 10px;}.fbody.svelte-1nyrbv3:not(.closed) {margin-top:10px;}.c-type.svelte-1nyrbv3 {display:none;}.row.head.svelte-1nyrbv3 .c-type:where(.svelte-1nyrbv3) {display:none;}.cards.svelte-1nyrbv3 {grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));}\n  }'
};

function AnimeList($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$4);

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

	// Wo schaubar (gespeicherte Treffer der Verfuegbarkeits-Pruefung) – fuer die Wunschliste: welche Titel auf welchem Dienst
	let streams = state(proxy({}));

	user_effect(() => {
		const ids = get(sections).flatMap((x) => x.items.map((i) => i.id)).slice(0, 500);

		if (!ids.length) return;

		$$props.api.streamingMap(ids).then((r) => {
			set(streams, r ?? {}, true);
		}).catch(() => {});
	});

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

	var div = root_18();
	var aside = child(div);
	var nav = child(aside);
	var button = child(nav);
	let classes;
	var i_1 = sibling(child(button));
	var text = only_child(i_1, true);

	var node = sibling(button, 2);

	each(node, 17, () => STATUS_ORDER, index, ($$anchor, s) => {
		var button_1 = root$4();
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
			var button_2 = root_1$4();
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
			var button_4 = root_2$4();

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
			var div_7 = root_5();
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
		var option_1 = root_6();
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

		var alternate_1 = ($$anchor) => {
			var fragment = comment();
			var node_7 = first_child(fragment);

			each(node_7, 17, () => get(sections), (sec) => sec.status, ($$anchor, sec) => {
				var div_19 = root_17();
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

					var alternate = ($$anchor) => {
						var div_22 = root_16();
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
							var button_9 = root_15();
							var span_2 = child(button_9);
							var node_12 = child(span_2);

							{
								var consequent_9 = ($$anchor) => {
									var span_3 = root_12();
									var node_13 = child(span_3);

									Cover(node_13, {
										get media() {
											return get(m);
										}
									});
									append($$anchor, span_3);
								};

								if_block(node_12, ($$render) => {
									if (get(viewMode) === 'table') $$render(consequent_9);
								});
							}

							var node_14 = sibling(node_12, 2);

							{
								var consequent_10 = ($$anchor) => {
									var span_4 = root_13();

									template_effect(() => set_attribute(span_4, 'title', STATUS_LABEL[get(m).watch_status ?? '']));
									append($$anchor, span_4);
								};

								var d_1 = user_derived(() => ACTIVE.has(get(m).watch_status ?? ''));

								if_block(node_14, ($$render) => {
									if (get(d_1)) $$render(consequent_10);
								});
							}

							var span_5 = sibling(node_14, 2);
							var text_10 = only_child(span_5, true);
							var node_15 = sibling(span_5, 2);

							each(node_15, 17, () => get(streams)[get(m).id] ?? [], index, ($$anchor, h) => {
								var span_6 = root_14();
								var text_11 = only_child(span_6, true);

								template_effect(() => set_text(text_11, get(h).service));
								append($$anchor, span_6);
							});

							var span_7 = sibling(span_2, 2);
							var text_12 = only_child(span_7, true);
							var span_8 = sibling(span_7, 2);
							var text_13 = only_child(span_8, true);
							var span_9 = sibling(span_8, 2);
							var text_14 = only_child(span_9, true);

							template_effect(
								($0, $1, $2) => {
									set_text(text_10, get(m).title);
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
						if (get(viewMode) === 'cards') $$render(consequent_7); else $$render(alternate, -1);
					});
				}
				append($$anchor, div_19);
			});

			append($$anchor, fragment);
		};

		if_block(node_6, ($$render) => {
			if (get(loading) && get(sections).length === 0) $$render(consequent_4); else if (get(sections).length === 0) $$render(consequent_5, 1); else $$render(alternate_1, -1);
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

var root$3 = from_html(`<div class="ph svelte-1i22kfc">lädt…</div>`);
var root_1$3 = from_html(`<div class="ph svelte-1i22kfc">Noch keine Favoriten. Öffne einen Titel und tippe auf das ♥.</div>`);
var root_2$3 = from_html(`<div draggable="true" role="button" tabindex="0"><span class="rank svelte-1i22kfc"> </span> <div class="cover svelte-1i22kfc"><!></div> <span class="title svelte-1i22kfc"> </span> <button class="heart svelte-1i22kfc" title="Aus Favoriten entfernen" aria-label="Entfernen">♥</button></div>`);
var root_3$1 = from_html(`<div class="grid svelte-1i22kfc"></div>`);
var root_4$1 = from_html(`<div class="favview svelte-1i22kfc"><header class="fhead svelte-1i22kfc"><h1 class="svelte-1i22kfc">Favoriten</h1> <p class="svelte-1i22kfc">Zieh die Einträge, um deine Rangliste zu ordnen — Platz 1 oben links.</p></header> <!></div>`);

const $$css$3 = {
	hash: 'svelte-1i22kfc',
	code: '.favview.svelte-1i22kfc {max-width:var(--maxw);margin:0 auto;padding:28px 20px 60px;}.fhead.svelte-1i22kfc h1:where(.svelte-1i22kfc) {margin:0;font-size:1.5rem;font-weight:600;color:var(--text-strong);}.fhead.svelte-1i22kfc p:where(.svelte-1i22kfc) {margin:4px 0 24px;color:var(--text-muted);font-size:0.88rem;}.ph.svelte-1i22kfc {text-align:center;color:var(--text-muted);padding:60px 0;}.grid.svelte-1i22kfc {display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:18px;}.fav.svelte-1i22kfc {position:relative;cursor:grab;display:flex;flex-direction:column;gap:6px;}.fav.svelte-1i22kfc:active {cursor:grabbing;}.fav.dragging.svelte-1i22kfc {opacity:0.45;}.rank.svelte-1i22kfc {position:absolute;top:6px;left:6px;z-index:2;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:0.82rem;min-width:22px;height:22px;padding:0 5px;border-radius:var(--radius-sm);display:grid;place-items:center;box-shadow:var(--shadow-sm);}.cover.svelte-1i22kfc {position:relative;aspect-ratio:185 / 265;border-radius:var(--radius);overflow:hidden;background:var(--surface);box-shadow:var(--shadow-sm);}.title.svelte-1i22kfc {font-size:0.85rem;font-weight:500;color:var(--text);line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}.heart.svelte-1i22kfc {position:absolute;top:6px;right:6px;z-index:2;width:26px;height:26px;border:0;border-radius:50%;background:rgba(0, 0, 0, 0.55);color:var(--accent);cursor:pointer;font-size:0.9rem;line-height:1;}'
};

function Favorites($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$3);

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

	var div = root_4$1();
	var node = sibling(child(div), 2);

	{
		var consequent = ($$anchor) => {
			var div_1 = root$3();

			append($$anchor, div_1);
		};

		var consequent_1 = ($$anchor) => {
			var div_2 = root_1$3();

			append($$anchor, div_2);
		};

		var alternate = ($$anchor) => {
			var div_3 = root_3$1();

			each(div_3, 23, () => get(items), (m) => m.id, ($$anchor, m, i) => {
				var div_4 = root_2$3();
				let classes;
				var span = child(div_4);
				var text = only_child(span, true);
				var div_5 = sibling(span, 2);
				var node_1 = child(div_5);

				Cover(node_1, {
					get media() {
						return get(m);
					}
				});

				var span_1 = sibling(div_5, 2);
				var text_1 = only_child(span_1, true);
				var button = sibling(span_1, 2);

				template_effect(() => {
					classes = set_class(div_4, 1, 'fav svelte-1i22kfc', null, classes, { dragging: get(dragI) === get(i) });
					set_text(text, get(i) + 1);
					set_text(text_1, get(m).title);
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
			if (get(loading)) $$render(consequent); else if (get(items).length === 0) $$render(consequent_1, 1); else $$render(alternate, -1);
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

var root$2 = from_html(`<button class="mback svelte-1bojhsa" aria-label="Menü schließen"></button> <div class="mpanel svelte-1bojhsa" role="menu"><button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 21 3.6 12.9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 8.4 6.9z"></path></svg> </button> <button><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"></path></svg> </button> <button class="svelte-1bojhsa"><svg viewBox="0 0 24 24" fill="currentColor" class="svelte-1bojhsa"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"></path></svg>Einstellungen</button></div>`, 1);
var root_1$2 = from_html(`<button class="fab svelte-1bojhsa" aria-label="Menü öffnen">☰</button>`);
var root_2$2 = from_html(`<header class="topbar svelte-1bojhsa"><div class="bar svelte-1bojhsa"><button class="brand svelte-1bojhsa" title="Medientyp wählen">Orbit<span class="svelte-1bojhsa">list</span> <em class="svelte-1bojhsa"> </em></button> <nav class="views svelte-1bojhsa"><button> </button> <button> </button> <button> </button> <button> </button> <button> </button></nav> <div class="spacer svelte-1bojhsa"></div> <button class="icon svelte-1bojhsa" title="Einstellungen" aria-label="Einstellungen">⚙</button></div></header> <div class="mnav svelte-1bojhsa"><!></div> <!> <!> <!> <!>`, 1);

const $$css$2 = {
	hash: 'svelte-1bojhsa',
	code: '.topbar.svelte-1bojhsa {position:sticky;top:0;z-index:20;background:var(--nav);border-bottom:1px solid var(--border);box-shadow:var(--shadow-sm);}.bar.svelte-1bojhsa {max-width:var(--maxw);margin:0 auto;display:flex;align-items:center;gap:16px;padding:10px 20px;}.brand.svelte-1bojhsa {background:none;border:0;color:var(--text-strong);font-weight:800;font-size:1.15rem;letter-spacing:-0.02em;cursor:pointer;}.brand.svelte-1bojhsa span:where(.svelte-1bojhsa) {color:var(--accent);}.brand.svelte-1bojhsa em:where(.svelte-1bojhsa) {font-style:normal;font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-left:4px;}.views.svelte-1bojhsa {display:flex;gap:2px;}.views.svelte-1bojhsa button:where(.svelte-1bojhsa) {padding:7px 13px;border-radius:var(--radius);border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-weight:600;font-size:0.9rem;transition:color 0.15s, background 0.15s;}.views.svelte-1bojhsa button:where(.svelte-1bojhsa):hover {color:var(--text);}.views.svelte-1bojhsa button.on:where(.svelte-1bojhsa) {background:var(--surface-2);color:var(--accent);}.spacer.svelte-1bojhsa {flex:1;}.icon.svelte-1bojhsa {position:relative;width:38px;height:38px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer;display:grid;place-items:center;}.mnav.svelte-1bojhsa {display:none;}\n  @media (max-width: 768px) {.views.svelte-1bojhsa, .topbar.svelte-1bojhsa .icon:where(.svelte-1bojhsa) {display:none;}.mnav.svelte-1bojhsa {display:block;position:fixed;right:16px;bottom:16px;z-index:60;}.fab.svelte-1bojhsa {width:52px;height:52px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--accent);font-size:1.6rem;cursor:pointer;box-shadow:var(--shadow-sm);}.mback.svelte-1bojhsa {position:fixed;inset:0;z-index:-1;background:rgba(0,0,0,.25);border:0;cursor:default;}.mpanel.svelte-1bojhsa svg:where(.svelte-1bojhsa) {width:30px;height:30px;}.mpanel.svelte-1bojhsa {display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;width:min(300px, calc(100vw - 32px));padding:10px;background:var(--surface);border:0;border-radius:var(--radius);box-shadow:0 6px 24px rgba(0,0,0,.4);}.mpanel.svelte-1bojhsa button:where(.svelte-1bojhsa) {display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 4px 10px;border:0;background:none;color:var(--text-muted);font-size:0.78rem;font-weight:600;cursor:pointer;border-radius:var(--radius);}.mpanel.svelte-1bojhsa button.on:where(.svelte-1bojhsa) {color:var(--accent);background:var(--surface-2);}.bar.svelte-1bojhsa {flex-wrap:wrap;gap:10px;}\n  }'
};

function Main($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$2);

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

	var fragment = root_2$2();
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
			var fragment_1 = root$2();
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
			var button_14 = root_1$2();

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

var root$1 = from_html(`<p class="lead svelte-111n8q1">Die Anime-Liste braucht ein Backend (deine eigene Datenbank). Trage dessen Adresse und das Passwort ein.</p> <label for="srv" class="svelte-111n8q1">Adresse mit Port</label> <input id="srv" placeholder="192.168.1.20:8787" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="url" class="svelte-111n8q1"/>`, 1);
var root_1$1 = from_html(`<p class="lead svelte-111n8q1">Dieses Backend ist passwortgeschützt.</p>`);
var root_2$1 = from_html(`<p class="err svelte-111n8q1"> </p>`);
var root_3 = from_html(`<p class="hint svelte-111n8q1">Noch kein Backend? Anleitung zum Selbst-Installieren: github.com/Entwicklerfuchs26/orbit-plugins/tree/main/orbit-list</p>`);
var root_4 = from_html(`<div class="cwrap svelte-111n8q1"><form class="card svelte-111n8q1"><h1 class="svelte-111n8q1">Orbitlist verbinden</h1> <!> <label for="pw" class="svelte-111n8q1">Passwort</label> <input id="pw" type="password" placeholder="Passwort des Backends" autocomplete="current-password" class="svelte-111n8q1"/> <!> <button class="go svelte-111n8q1"> </button> <!></form></div>`);

const $$css$1 = {
	hash: 'svelte-111n8q1',
	code: '.cwrap.svelte-111n8q1 {position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:var(--bg, #111);overflow:auto;}.card.svelte-111n8q1 {width:min(420px, 100%);display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow-sm);}h1.svelte-111n8q1 {margin:0 0 4px;font-size:1.25rem;color:var(--text);}.lead.svelte-111n8q1, .hint.svelte-111n8q1 {margin:0 0 8px;color:var(--text-muted);font-size:0.88rem;line-height:1.4;}label.svelte-111n8q1 {font-size:0.8rem;color:var(--text-muted);margin-top:6px;}input.svelte-111n8q1 {padding:11px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg, transparent);color:var(--text);font-size:1rem;outline:none;}input.svelte-111n8q1:focus {border-color:var(--accent);}.err.svelte-111n8q1 {margin:6px 0 0;color:#e85d75;font-size:0.86rem;}.go.svelte-111n8q1 {margin-top:12px;padding:12px;border:0;border-radius:var(--radius-sm);background:var(--accent);color:#022;font-weight:700;font-size:1rem;cursor:pointer;}.go.svelte-111n8q1:disabled {opacity:0.6;cursor:default;}'
};

function Connect($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css$1);

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
			var fragment = root$1();
			var input = sibling(first_child(fragment), 4);
			bind_value(input, () => get(server), ($$value) => set(server, $$value));
			append($$anchor, fragment);
		};

		var alternate = ($$anchor) => {
			var p = root_1$1();

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
			var p_1 = root_2$1();
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

var root = from_html(`<p class="err svelte-feasjn"> </p> <label for="cu" class="svelte-feasjn">Katalog-Quelle (Adresse der .db.gz-Datei)</label> <input id="cu" placeholder="https://github.com/Entwicklerfuchs26/orbit-plugins/releases/download/orbit-list-catalog/catalog.db.gz" autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="url" class="svelte-feasjn"/> <button class="go svelte-feasjn">Erneut versuchen</button> <p class="hint svelte-feasjn">Der Katalog wird nur beim ersten Start geladen (Internet nötig). Die Adresse kann auch ein eigenes Backend sein (…/catalog/slim.db.gz).</p>`, 1);
var root_1 = from_html(`<p class="lead svelte-feasjn"> </p> <div class="bar svelte-feasjn"><div class="svelte-feasjn"></div></div>`, 1);
var root_2 = from_html(`<div class="cwrap svelte-feasjn"><div class="card svelte-feasjn"><h1 class="svelte-feasjn">Orbit-List startet</h1> <!></div></div>`);

const $$css = {
	hash: 'svelte-feasjn',
	code: '.cwrap.svelte-feasjn {position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:var(--bg, #111);overflow:auto;}.card.svelte-feasjn {width:min(420px, 100%);display:flex;flex-direction:column;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow-sm);}h1.svelte-feasjn {margin:0 0 4px;font-size:1.25rem;color:var(--text);}.lead.svelte-feasjn, .hint.svelte-feasjn {margin:0 0 8px;color:var(--text-muted);font-size:0.88rem;line-height:1.4;}label.svelte-feasjn {font-size:0.8rem;color:var(--text-muted);margin-top:6px;}input.svelte-feasjn {padding:11px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg, transparent);color:var(--text);font-size:1rem;outline:none;}.err.svelte-feasjn {margin:6px 0 0;color:#e85d75;font-size:0.86rem;word-break:break-word;}.go.svelte-feasjn {margin-top:12px;padding:12px;border:0;border-radius:var(--radius-sm);background:var(--accent);color:#022;font-weight:700;font-size:1rem;cursor:pointer;}.bar.svelte-feasjn {height:6px;border-radius:3px;background:var(--border);overflow:hidden;}.bar.svelte-feasjn div:where(.svelte-feasjn) {height:100%;background:var(--accent);transition:width 0.3s;}'
};

function Boot($$anchor, $$props) {
	push($$props, true);
	append_styles($$anchor, $$css);

	let url = state(proxy(emb.catalogUrl));

	function retry() {
		saveCatalogUrl(get(url));
		emb.needCatalogUrl = false;
		emb.phase = 'idle';
		boot(conn.defaultServer).catch(() => {});
	}

	var div = root_2();
	var div_1 = child(div);
	var node = sibling(child(div_1), 2);

	{
		var consequent = ($$anchor) => {
			var fragment = root();
			var p = first_child(fragment);
			var text = only_child(p, true);
			var input = sibling(p, 4);

			var button = sibling(input, 2);
			template_effect(() => set_text(text, emb.msg));
			bind_value(input, () => get(url), ($$value) => set(url, $$value));
			delegated('click', button, retry);
			append($$anchor, fragment);
		};

		var alternate = ($$anchor) => {
			var fragment_1 = root_1();
			var p_1 = first_child(fragment_1);
			var text_1 = only_child(p_1, true);
			var div_2 = sibling(p_1, 2);
			var div_3 = only_child(div_2);

			template_effect(() => {
				set_text(text_1, emb.msg || 'Einen Moment …');
				set_style(div_3, `width:${emb.pct ?? ''}%`);
			});

			append($$anchor, fragment_1);
		};

		if_block(node, ($$render) => {
			if (emb.phase === 'error') $$render(consequent); else $$render(alternate, -1);
		});
	}
	append($$anchor, div);
	pop();
}

delegate(['click']);

function App($$anchor, $$props) {
	push($$props, true);

	// Wurzel: Verbindung pruefen/aufbauen, dann die eigentliche App (Main) mounten.
	// Beim Verbinden (conn.rev) wird Main komplett neu aufgebaut und holt alle Daten frisch.
	if (conn.mode === 'embedded') boot(conn.defaultServer).catch(() => {});

	let warmed = false;

	user_effect(() => {
		if (conn.mode === 'embedded' && emb.phase === 'ready' && !warmed) {
			warmed = true;
			setTimeout(() => Promise.resolve().then(() => warmup).then((m) => m.warmScores()).catch(() => {}), 4000);
		}
	});

	var fragment = comment();
	var node = first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Boot($$anchor, {});
		};

		var consequent_1 = ($$anchor) => {
			Connect($$anchor, {});
		};

		var alternate = ($$anchor) => {
			var fragment_3 = comment();
			var node_1 = first_child(fragment_3);

			key(node_1, () => conn.rev, ($$anchor) => {
				Main($$anchor, {});
			});

			append($$anchor, fragment_3);
		};

		if_block(node, ($$render) => {
			if (conn.mode === 'embedded' && emb.phase !== 'ready') $$render(consequent); else if (conn.needsSetup) $$render(consequent_1, 1); else $$render(alternate, -1);
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
const netGet = async (url) => {
  if (Capacitor.isNativePlatform()) {
    const r2 = await CapacitorHttp.request({ url, method: "GET", responseType: "blob", connectTimeout: 15e3, readTimeout: 12e4 });
    if (r2.status !== 200) throw new Error(`Katalog-Quelle antwortet mit Status ${r2.status}.`);
    const bin = atob(r2.data);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Katalog-Quelle antwortet mit Status ${r.status}.`);
  return new Uint8Array(await r.arrayBuffer());
};
const netSize = async (url) => {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.request({ url, method: "HEAD", connectTimeout: 1e4, readTimeout: 15e3 });
    const h = Object.entries(r.headers || {}).find(([k]) => k.toLowerCase() === "content-length");
    return h ? Number(h[1]) : null;
  }
  const l = (await fetch(url, { method: "HEAD" })).headers.get("content-length");
  return l ? Number(l) : null;
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
        if (opts.embedded) {
          setNet(netGet, netSize);
          configure({ embedded: true, defaultServer: opts.defaultServer, http: embeddedHttp, storageKey: `orbitlist.conn.${id}` });
        } else {
          configure({ plugin: true, defaultServer: opts.defaultServer, http, storageKey: `orbitlist.conn.${id}` });
        }
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
  id: "orbit-list-connect",
  name: "Orbit-List Connect (Test)",
  version: "0.5.1",
  description: "Reines Frontend für mehrere Geräte: verbindet sich mit einem eigenen Orbit-List-Backend (Adresse:Port + Passwort). Das Backend kannst du selbst betreiben.",
  author: "Entwicklerfuchs",
  main: "main.js",
  type: "gui",
  platforms: ["desktop", "mobile", "web"]
};
const orbitListConnect = makePlugin(manifest.id, "Orbit-List Connect");

const KEY = "orbitlist.warm";
const BATCH = 600;
async function warmScores() {
  try {
    if (Date.now() - Number(localStorage.getItem(KEY) || 0) < 6 * 3600 * 1e3) return;
  } catch {
  }
  const ids = [];
  for (let off = 0; ids.length < BATCH && off < 4e3; off += 400) {
    const r = await api.anime({ sort: "popularity", limit: 400, offset: off });
    for (const m of r.items ?? []) if (m.anilist_id && m.average_score == null) ids.push(m.anilist_id);
    if (!(r.items ?? []).length) break;
  }
  const want = ids.slice(0, BATCH);
  if (!want.length) return;
  const res = await Promise.all(want.map(async (id) => ({ id, l: await getLight(id).catch(() => null) })));
  const items = res.filter((x) => x.l?.score).map((x) => ({ anilist_id: x.id, score: x.l.score }));
  for (let i = 0; i < items.length; i += 500) await api.putScores(items.slice(i, i + 500));
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
  }
}

const warmup = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	warmScores
}, Symbol.toStringTag, { value: 'Module' }));

export { orbitListConnect as default, manifest };
