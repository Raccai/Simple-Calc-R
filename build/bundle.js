
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }

    new Set();
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    new Map();

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    const _boolean_attributes = [
        'allowfullscreen',
        'allowpaymentrequest',
        'async',
        'autofocus',
        'autoplay',
        'checked',
        'controls',
        'default',
        'defer',
        'disabled',
        'formnovalidate',
        'hidden',
        'inert',
        'ismap',
        'loop',
        'multiple',
        'muted',
        'nomodule',
        'novalidate',
        'open',
        'playsinline',
        'readonly',
        'required',
        'reversed',
        'selected'
    ];
    /**
     * List of HTML boolean attributes (e.g. `<input disabled>`).
     * Source: https://html.spec.whatwg.org/multipage/indices.html
     */
    new Set([..._boolean_attributes]);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.58.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Card.svelte generated by Svelte v3.58.0 */

    const file$4 = "src\\components\\Card.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "card svelte-1go0izw");
    			add_location(div, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Card', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Display.svelte generated by Svelte v3.58.0 */

    const file$3 = "src\\components\\Display.svelte";

    function create_fragment$3(ctx) {
    	let div6;
    	let div0;
    	let input0;
    	let t0;
    	let div1;
    	let input1;
    	let t1;
    	let div5;
    	let div2;
    	let input2;
    	let t2;
    	let div3;
    	let input3;
    	let t3;
    	let div4;
    	let input4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t1 = space();
    			div5 = element("div");
    			div2 = element("div");
    			input2 = element("input");
    			t2 = space();
    			div3 = element("div");
    			input3 = element("input");
    			t3 = space();
    			div4 = element("div");
    			input4 = element("input");
    			attr_dev(input0, "type", "text");
    			input0.disabled = true;
    			attr_dev(input0, "class", "svelte-1iwxcak");
    			add_location(input0, file$3, 7, 8, 151);
    			attr_dev(div0, "class", "prevDisplay svelte-1iwxcak");
    			add_location(div0, file$3, 6, 4, 116);
    			attr_dev(input1, "type", "text");
    			input1.disabled = true;
    			attr_dev(input1, "class", "svelte-1iwxcak");
    			add_location(input1, file$3, 10, 8, 255);
    			attr_dev(div1, "class", "display svelte-1iwxcak");
    			add_location(div1, file$3, 9, 4, 224);
    			attr_dev(input2, "type", "text");
    			input2.disabled = true;
    			attr_dev(input2, "class", "svelte-1iwxcak");
    			add_location(input2, file$3, 13, 32, 382);
    			attr_dev(div2, "class", "back-rec-1 svelte-1iwxcak");
    			add_location(div2, file$3, 13, 8, 358);
    			attr_dev(input3, "type", "text");
    			input3.disabled = true;
    			attr_dev(input3, "class", "svelte-1iwxcak");
    			add_location(input3, file$3, 14, 32, 450);
    			attr_dev(div3, "class", "back-rec-2 svelte-1iwxcak");
    			add_location(div3, file$3, 14, 8, 426);
    			attr_dev(input4, "type", "text");
    			input4.disabled = true;
    			attr_dev(input4, "class", "svelte-1iwxcak");
    			add_location(input4, file$3, 15, 32, 518);
    			attr_dev(div4, "class", "back-rec-3 svelte-1iwxcak");
    			add_location(div4, file$3, 15, 8, 494);
    			attr_dev(div5, "class", "otherBoxes svelte-1iwxcak");
    			add_location(div5, file$3, 12, 4, 324);
    			attr_dev(div6, "class", "container svelte-1iwxcak");
    			add_location(div6, file$3, 5, 0, 87);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*prevDisplay*/ ctx[1]);
    			append_dev(div6, t0);
    			append_dev(div6, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*display*/ ctx[0]);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, input2);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, input3);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, input4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[2]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*prevDisplay*/ 2 && input0.value !== /*prevDisplay*/ ctx[1]) {
    				set_input_value(input0, /*prevDisplay*/ ctx[1]);
    			}

    			if (dirty & /*display*/ 1 && input1.value !== /*display*/ ctx[0]) {
    				set_input_value(input1, /*display*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Display', slots, []);
    	let { display = "" } = $$props;
    	let { prevDisplay = "" } = $$props;
    	const writable_props = ['display', 'prevDisplay'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Display> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		prevDisplay = this.value;
    		$$invalidate(1, prevDisplay);
    	}

    	function input1_input_handler() {
    		display = this.value;
    		$$invalidate(0, display);
    	}

    	$$self.$$set = $$props => {
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('prevDisplay' in $$props) $$invalidate(1, prevDisplay = $$props.prevDisplay);
    	};

    	$$self.$capture_state = () => ({ display, prevDisplay });

    	$$self.$inject_state = $$props => {
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('prevDisplay' in $$props) $$invalidate(1, prevDisplay = $$props.prevDisplay);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [display, prevDisplay, input0_input_handler, input1_input_handler];
    }

    class Display extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { display: 0, prevDisplay: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Display",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get display() {
    		throw new Error("<Display>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set display(value) {
    		throw new Error("<Display>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prevDisplay() {
    		throw new Error("<Display>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prevDisplay(value) {
    		throw new Error("<Display>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Table.svelte generated by Svelte v3.58.0 */

    const { console: console_1 } = globals;
    const file$2 = "src\\components\\Table.svelte";

    function create_fragment$2(ctx) {
    	let display_1;
    	let t0;
    	let table;
    	let tr0;
    	let td0;
    	let button0;
    	let t2;
    	let td1;
    	let button1;
    	let t4;
    	let td2;
    	let button2;
    	let t6;
    	let td3;
    	let button3;
    	let t8;
    	let tr1;
    	let td4;
    	let button4;
    	let t10;
    	let td5;
    	let button5;
    	let t12;
    	let td6;
    	let button6;
    	let t14;
    	let td7;
    	let button7;
    	let t16;
    	let tr2;
    	let td8;
    	let button8;
    	let t18;
    	let td9;
    	let button9;
    	let t20;
    	let td10;
    	let button10;
    	let t22;
    	let td11;
    	let button11;
    	let t24;
    	let tr3;
    	let td12;
    	let button12;
    	let t26;
    	let td13;
    	let button13;
    	let t28;
    	let td14;
    	let button14;
    	let t30;
    	let td15;
    	let button15;
    	let t32;
    	let tr4;
    	let td16;
    	let button16;
    	let t34;
    	let td17;
    	let button17;
    	let t36;
    	let td18;
    	let button18;
    	let t38;
    	let td19;
    	let button19;
    	let current;
    	let mounted;
    	let dispose;

    	display_1 = new Display({
    			props: {
    				display: /*display*/ ctx[0],
    				prevDisplay: /*prevDisplay*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(display_1.$$.fragment);
    			t0 = space();
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			button0 = element("button");
    			button0.textContent = "C";
    			t2 = space();
    			td1 = element("td");
    			button1 = element("button");
    			button1.textContent = "×";
    			t4 = space();
    			td2 = element("td");
    			button2 = element("button");
    			button2.textContent = "÷";
    			t6 = space();
    			td3 = element("td");
    			button3 = element("button");
    			button3.textContent = "Del";
    			t8 = space();
    			tr1 = element("tr");
    			td4 = element("td");
    			button4 = element("button");
    			button4.textContent = "7";
    			t10 = space();
    			td5 = element("td");
    			button5 = element("button");
    			button5.textContent = "8";
    			t12 = space();
    			td6 = element("td");
    			button6 = element("button");
    			button6.textContent = "9";
    			t14 = space();
    			td7 = element("td");
    			button7 = element("button");
    			button7.textContent = "+";
    			t16 = space();
    			tr2 = element("tr");
    			td8 = element("td");
    			button8 = element("button");
    			button8.textContent = "4";
    			t18 = space();
    			td9 = element("td");
    			button9 = element("button");
    			button9.textContent = "5";
    			t20 = space();
    			td10 = element("td");
    			button10 = element("button");
    			button10.textContent = "6";
    			t22 = space();
    			td11 = element("td");
    			button11 = element("button");
    			button11.textContent = "-";
    			t24 = space();
    			tr3 = element("tr");
    			td12 = element("td");
    			button12 = element("button");
    			button12.textContent = "1";
    			t26 = space();
    			td13 = element("td");
    			button13 = element("button");
    			button13.textContent = "2";
    			t28 = space();
    			td14 = element("td");
    			button14 = element("button");
    			button14.textContent = "3";
    			t30 = space();
    			td15 = element("td");
    			button15 = element("button");
    			button15.textContent = ".";
    			t32 = space();
    			tr4 = element("tr");
    			td16 = element("td");
    			button16 = element("button");
    			button16.textContent = "0";
    			t34 = space();
    			td17 = element("td");
    			button17 = element("button");
    			button17.textContent = "(";
    			t36 = space();
    			td18 = element("td");
    			button18 = element("button");
    			button18.textContent = ")";
    			t38 = space();
    			td19 = element("td");
    			button19 = element("button");
    			button19.textContent = "=";
    			attr_dev(button0, "class", "btn-operation svelte-1duq0p4");
    			add_location(button0, file$2, 30, 12, 837);
    			add_location(td0, file$2, 30, 8, 833);
    			attr_dev(button1, "class", "btn-operation svelte-1duq0p4");
    			add_location(button1, file$2, 31, 12, 929);
    			add_location(td1, file$2, 31, 8, 925);
    			attr_dev(button2, "class", "btn-operation svelte-1duq0p4");
    			add_location(button2, file$2, 32, 12, 1022);
    			add_location(td2, file$2, 32, 8, 1018);
    			attr_dev(button3, "class", "btn-operation svelte-1duq0p4");
    			add_location(button3, file$2, 33, 12, 1116);
    			add_location(td3, file$2, 33, 8, 1112);
    			add_location(tr0, file$2, 29, 4, 819);
    			attr_dev(button4, "class", "btn-number svelte-1duq0p4");
    			add_location(button4, file$2, 36, 12, 1232);
    			add_location(td4, file$2, 36, 8, 1228);
    			attr_dev(button5, "class", "btn-number svelte-1duq0p4");
    			add_location(button5, file$2, 37, 12, 1317);
    			add_location(td5, file$2, 37, 8, 1313);
    			attr_dev(button6, "class", "btn-number svelte-1duq0p4");
    			add_location(button6, file$2, 38, 12, 1402);
    			add_location(td6, file$2, 38, 8, 1398);
    			attr_dev(button7, "class", "btn-operation svelte-1duq0p4");
    			add_location(button7, file$2, 39, 12, 1487);
    			add_location(td7, file$2, 39, 8, 1483);
    			add_location(tr1, file$2, 35, 4, 1214);
    			attr_dev(button8, "class", "btn-number svelte-1duq0p4");
    			add_location(button8, file$2, 42, 12, 1596);
    			add_location(td8, file$2, 42, 8, 1592);
    			attr_dev(button9, "class", "btn-number svelte-1duq0p4");
    			add_location(button9, file$2, 43, 12, 1681);
    			add_location(td9, file$2, 43, 8, 1677);
    			attr_dev(button10, "class", "btn-number svelte-1duq0p4");
    			add_location(button10, file$2, 44, 12, 1766);
    			add_location(td10, file$2, 44, 8, 1762);
    			attr_dev(button11, "class", "btn-operation svelte-1duq0p4");
    			add_location(button11, file$2, 45, 12, 1851);
    			add_location(td11, file$2, 45, 8, 1847);
    			add_location(tr2, file$2, 41, 4, 1578);
    			attr_dev(button12, "class", "btn-number svelte-1duq0p4");
    			add_location(button12, file$2, 48, 12, 1960);
    			add_location(td12, file$2, 48, 8, 1956);
    			attr_dev(button13, "class", "btn-number svelte-1duq0p4");
    			add_location(button13, file$2, 49, 12, 2045);
    			add_location(td13, file$2, 49, 8, 2041);
    			attr_dev(button14, "class", "btn-number svelte-1duq0p4");
    			add_location(button14, file$2, 50, 12, 2130);
    			add_location(td14, file$2, 50, 8, 2126);
    			attr_dev(button15, "class", "btn-operation svelte-1duq0p4");
    			add_location(button15, file$2, 51, 12, 2215);
    			add_location(td15, file$2, 51, 8, 2211);
    			add_location(tr3, file$2, 47, 4, 1942);
    			attr_dev(button16, "class", "btn-number svelte-1duq0p4");
    			add_location(button16, file$2, 54, 12, 2324);
    			add_location(td16, file$2, 54, 8, 2320);
    			attr_dev(button17, "class", "btn-operation svelte-1duq0p4");
    			add_location(button17, file$2, 55, 12, 2409);
    			add_location(td17, file$2, 55, 8, 2405);
    			attr_dev(button18, "class", "btn-operation svelte-1duq0p4");
    			add_location(button18, file$2, 56, 12, 2497);
    			add_location(td18, file$2, 56, 8, 2493);
    			attr_dev(button19, "class", "btn-operation svelte-1duq0p4");
    			attr_dev(button19, "id", "equal");
    			add_location(button19, file$2, 58, 12, 2617);
    			attr_dev(td19, "class", "equal-div svelte-1duq0p4");
    			add_location(td19, file$2, 57, 8, 2581);
    			add_location(tr4, file$2, 53, 4, 2306);
    			add_location(table, file$2, 28, 0, 806);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(display_1, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(td0, button0);
    			append_dev(tr0, t2);
    			append_dev(tr0, td1);
    			append_dev(td1, button1);
    			append_dev(tr0, t4);
    			append_dev(tr0, td2);
    			append_dev(td2, button2);
    			append_dev(tr0, t6);
    			append_dev(tr0, td3);
    			append_dev(td3, button3);
    			append_dev(table, t8);
    			append_dev(table, tr1);
    			append_dev(tr1, td4);
    			append_dev(td4, button4);
    			append_dev(tr1, t10);
    			append_dev(tr1, td5);
    			append_dev(td5, button5);
    			append_dev(tr1, t12);
    			append_dev(tr1, td6);
    			append_dev(td6, button6);
    			append_dev(tr1, t14);
    			append_dev(tr1, td7);
    			append_dev(td7, button7);
    			append_dev(table, t16);
    			append_dev(table, tr2);
    			append_dev(tr2, td8);
    			append_dev(td8, button8);
    			append_dev(tr2, t18);
    			append_dev(tr2, td9);
    			append_dev(td9, button9);
    			append_dev(tr2, t20);
    			append_dev(tr2, td10);
    			append_dev(td10, button10);
    			append_dev(tr2, t22);
    			append_dev(tr2, td11);
    			append_dev(td11, button11);
    			append_dev(table, t24);
    			append_dev(table, tr3);
    			append_dev(tr3, td12);
    			append_dev(td12, button12);
    			append_dev(tr3, t26);
    			append_dev(tr3, td13);
    			append_dev(td13, button13);
    			append_dev(tr3, t28);
    			append_dev(tr3, td14);
    			append_dev(td14, button14);
    			append_dev(tr3, t30);
    			append_dev(tr3, td15);
    			append_dev(td15, button15);
    			append_dev(table, t32);
    			append_dev(table, tr4);
    			append_dev(tr4, td16);
    			append_dev(td16, button16);
    			append_dev(tr4, t34);
    			append_dev(tr4, td17);
    			append_dev(td17, button17);
    			append_dev(tr4, t36);
    			append_dev(tr4, td18);
    			append_dev(td18, button18);
    			append_dev(tr4, t38);
    			append_dev(tr4, td19);
    			append_dev(td19, button19);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[3], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[4], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[5], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[6], false, false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[7], false, false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[8], false, false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[9], false, false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[10], false, false, false, false),
    					listen_dev(button8, "click", /*click_handler_8*/ ctx[11], false, false, false, false),
    					listen_dev(button9, "click", /*click_handler_9*/ ctx[12], false, false, false, false),
    					listen_dev(button10, "click", /*click_handler_10*/ ctx[13], false, false, false, false),
    					listen_dev(button11, "click", /*click_handler_11*/ ctx[14], false, false, false, false),
    					listen_dev(button12, "click", /*click_handler_12*/ ctx[15], false, false, false, false),
    					listen_dev(button13, "click", /*click_handler_13*/ ctx[16], false, false, false, false),
    					listen_dev(button14, "click", /*click_handler_14*/ ctx[17], false, false, false, false),
    					listen_dev(button15, "click", /*click_handler_15*/ ctx[18], false, false, false, false),
    					listen_dev(button16, "click", /*click_handler_16*/ ctx[19], false, false, false, false),
    					listen_dev(button17, "click", /*click_handler_17*/ ctx[20], false, false, false, false),
    					listen_dev(button18, "click", /*click_handler_18*/ ctx[21], false, false, false, false),
    					listen_dev(button19, "click", /*click_handler_19*/ ctx[22], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const display_1_changes = {};
    			if (dirty & /*display*/ 1) display_1_changes.display = /*display*/ ctx[0];
    			if (dirty & /*prevDisplay*/ 2) display_1_changes.prevDisplay = /*prevDisplay*/ ctx[1];
    			display_1.$set(display_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(display_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(display_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(display_1, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(table);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Table', slots, []);
    	let display = "";
    	let prevDisplay = "";

    	const doMath = type => {
    		if (type == "clear") {
    			$$invalidate(0, display = "");
    			$$invalidate(1, prevDisplay = "");
    		} else if (type == "delete") {
    			let displayText = display;
    			$$invalidate(0, display = displayText.substring(0, displayText.length - 1));
    		} else if (display != "" && type == "equate") {
    			$$invalidate(1, prevDisplay = display);
    			$$invalidate(0, display = eval(display));
    		} else if (display == "" && type == "equate") {
    			$$invalidate(0, display = "Empty");
    			setTimeout(() => $$invalidate(0, display = ""), 2000);
    		} else {
    			$$invalidate(0, display += type);
    		}

    		console.log(display);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => doMath("clear");
    	const click_handler_1 = () => doMath("*");
    	const click_handler_2 = () => doMath("/");
    	const click_handler_3 = () => doMath("delete");
    	const click_handler_4 = () => doMath("7");
    	const click_handler_5 = () => doMath("8");
    	const click_handler_6 = () => doMath("9");
    	const click_handler_7 = () => doMath("+");
    	const click_handler_8 = () => doMath("4");
    	const click_handler_9 = () => doMath("5");
    	const click_handler_10 = () => doMath("6");
    	const click_handler_11 = () => doMath("-");
    	const click_handler_12 = () => doMath("1");
    	const click_handler_13 = () => doMath("2");
    	const click_handler_14 = () => doMath("3");
    	const click_handler_15 = () => doMath(".");
    	const click_handler_16 = () => doMath("0");
    	const click_handler_17 = () => doMath("(");
    	const click_handler_18 = () => doMath(")");
    	const click_handler_19 = () => doMath("equate");
    	$$self.$capture_state = () => ({ Display, display, prevDisplay, doMath });

    	$$self.$inject_state = $$props => {
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('prevDisplay' in $$props) $$invalidate(1, prevDisplay = $$props.prevDisplay);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		display,
    		prevDisplay,
    		doMath,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15,
    		click_handler_16,
    		click_handler_17,
    		click_handler_18,
    		click_handler_19
    	];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\Header.svelte generated by Svelte v3.58.0 */

    const file$1 = "src\\components\\Header.svelte";

    function create_fragment$1(ctx) {
    	let header;
    	let div;
    	let img0;
    	let img0_src_value;
    	let t;
    	let img1;
    	let img1_src_value;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div = element("div");
    			img0 = element("img");
    			t = space();
    			img1 = element("img");
    			if (!src_url_equal(img0.src, img0_src_value = "./img/banner.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "banner svelte-1xblywx");
    			add_location(img0, file$1, 2, 8, 29);
    			if (!src_url_equal(img1.src, img1_src_value = "./img/title.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "title svelte-1xblywx");
    			add_location(img1, file$1, 3, 8, 89);
    			attr_dev(div, "class", "svelte-1xblywx");
    			add_location(div, file$1, 1, 4, 14);
    			add_location(header, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div);
    			append_dev(div, img0);
    			append_dev(div, t);
    			append_dev(div, img1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.58.0 */
    const file = "src\\App.svelte";

    // (9:1) <Card>
    function create_default_slot(ctx) {
    	let table;
    	let current;
    	table = new Table({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(table.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(table, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(table, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(9:1) <Card>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t;
    	let card;
    	let current;
    	header = new Header({ $$inline: true });

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(card.$$.fragment);
    			attr_dev(main, "class", "svelte-1u6cm4a");
    			add_location(main, file, 6, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t);
    			mount_component(card, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Card, Table, Header });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
