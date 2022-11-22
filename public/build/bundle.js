
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
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
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
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
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.53.1' }, detail), { bubbles: true }));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let cardStore = writable({
      name: "Jane Appleseed",
      number: "0000 0000 0000 0000",
      month: "00",
      year: "00",
      cvc: "000",
    });

    /* src\components\CardPreview.svelte generated by Svelte v3.53.1 */
    const file$3 = "src\\components\\CardPreview.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let p0;
    	let t1;
    	let t2;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let p1;
    	let t4;
    	let t5;
    	let p2;
    	let t6;
    	let t7;
    	let p3;
    	let t8;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			p0 = element("p");
    			t1 = text(/*cvc*/ ctx[1]);
    			t2 = space();
    			img1 = element("img");
    			t3 = space();
    			p1 = element("p");
    			t4 = text(/*cNumber*/ ctx[2]);
    			t5 = space();
    			p2 = element("p");
    			t6 = text(/*cName*/ ctx[3]);
    			t7 = space();
    			p3 = element("p");
    			t8 = text(/*expDate*/ ctx[0]);
    			attr_dev(img0, "class", "card-back svelte-q61d3t");
    			if (!src_url_equal(img0.src, img0_src_value = "/images/bg-card-back.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "back of credit card");
    			add_location(img0, file$3, 19, 4, 640);
    			attr_dev(p0, "class", "cvc svelte-q61d3t");
    			add_location(p0, file$3, 24, 4, 754);
    			attr_dev(img1, "class", "card-front svelte-q61d3t");
    			if (!src_url_equal(img1.src, img1_src_value = "/images/bg-card-front.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "front of credit card");
    			add_location(img1, file$3, 25, 4, 784);
    			attr_dev(p1, "class", "card-num svelte-q61d3t");
    			add_location(p1, file$3, 30, 4, 901);
    			attr_dev(p2, "class", "card-name svelte-q61d3t");
    			add_location(p2, file$3, 31, 4, 940);
    			attr_dev(p3, "class", "exp-date svelte-q61d3t");
    			add_location(p3, file$3, 32, 4, 978);
    			attr_dev(div0, "class", "top svelte-q61d3t");
    			add_location(div0, file$3, 18, 2, 617);
    			attr_dev(div1, "class", "card-preview svelte-q61d3t");
    			add_location(div1, file$3, 17, 0, 587);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(p0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, img1);
    			append_dev(div0, t3);
    			append_dev(div0, p1);
    			append_dev(p1, t4);
    			append_dev(div0, t5);
    			append_dev(div0, p2);
    			append_dev(p2, t6);
    			append_dev(div0, t7);
    			append_dev(div0, p3);
    			append_dev(p3, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cvc*/ 2) set_data_dev(t1, /*cvc*/ ctx[1]);
    			if (dirty & /*cNumber*/ 4) set_data_dev(t4, /*cNumber*/ ctx[2]);
    			if (dirty & /*cName*/ 8) set_data_dev(t6, /*cName*/ ctx[3]);
    			if (dirty & /*expDate*/ 1) set_data_dev(t8, /*expDate*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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
    	let cName;
    	let cNumber;
    	let cvc;
    	let expDate;
    	let $cardStore;
    	validate_store(cardStore, 'cardStore');
    	component_subscribe($$self, cardStore, $$value => $$invalidate(4, $cardStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CardPreview', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CardPreview> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		cardStore,
    		expDate,
    		cvc,
    		cNumber,
    		cName,
    		$cardStore
    	});

    	$$self.$inject_state = $$props => {
    		if ('expDate' in $$props) $$invalidate(0, expDate = $$props.expDate);
    		if ('cvc' in $$props) $$invalidate(1, cvc = $$props.cvc);
    		if ('cNumber' in $$props) $$invalidate(2, cNumber = $$props.cNumber);
    		if ('cName' in $$props) $$invalidate(3, cName = $$props.cName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$cardStore*/ 16) {
    			// If undefined, set default values
    			$$invalidate(3, cName = typeof $cardStore.name === "undefined"
    			? "Jane Appleseed"
    			: $cardStore.name);
    		}

    		if ($$self.$$.dirty & /*$cardStore*/ 16) {
    			$$invalidate(2, cNumber = typeof $cardStore.number === "undefined"
    			? "0000 0000 0000 0000"
    			: $cardStore.number);
    		}

    		if ($$self.$$.dirty & /*$cardStore*/ 16) {
    			$$invalidate(1, cvc = typeof $cardStore.cvc === "undefined"
    			? "000"
    			: $cardStore.cvc);
    		}

    		if ($$self.$$.dirty & /*$cardStore*/ 16) {
    			$$invalidate(0, expDate = (typeof $cardStore.month === "undefined"
    			? "00"
    			: $cardStore.month) + "/" + (typeof $cardStore.year === "undefined"
    			? "00"
    			: $cardStore.year));
    		}
    	};

    	return [expDate, cvc, cNumber, cName, $cardStore];
    }

    class CardPreview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardPreview",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\CardForm.svelte generated by Svelte v3.53.1 */
    const file$2 = "src\\components\\CardForm.svelte";

    // (192:6) {#if isErrorName}
    function create_if_block_2(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*msgErrorName*/ ctx[6]);
    			attr_dev(div, "class", "is-error svelte-imex1w");
    			add_location(div, file$2, 191, 23, 4883);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*msgErrorName*/ 64) set_data_dev(t, /*msgErrorName*/ ctx[6]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(192:6) {#if isErrorName}",
    		ctx
    	});

    	return block;
    }

    // (208:6) {#if isErrorNum}
    function create_if_block_1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*msgErrorNum*/ ctx[8]);
    			attr_dev(div, "class", "is-error svelte-imex1w");
    			add_location(div, file$2, 207, 22, 5349);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*msgErrorNum*/ 256) set_data_dev(t, /*msgErrorNum*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(208:6) {#if isErrorNum}",
    		ctx
    	});

    	return block;
    }

    // (243:8) {#if isErrorMonth || isErrorYear || isErrorCvc}
    function create_if_block$1(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(/*msgErrorMonthYear*/ ctx[11]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*msgErrorCvc*/ ctx[13]);
    			attr_dev(div0, "class", "two-column is-error svelte-imex1w");
    			add_location(div0, file$2, 243, 10, 6398);
    			attr_dev(div1, "class", "is-error svelte-imex1w");
    			add_location(div1, file$2, 246, 10, 6494);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*msgErrorMonthYear*/ 2048) set_data_dev(t0, /*msgErrorMonthYear*/ ctx[11]);
    			if (dirty & /*msgErrorCvc*/ 8192) set_data_dev(t2, /*msgErrorCvc*/ ctx[13]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(243:8) {#if isErrorMonth || isErrorYear || isErrorCvc}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div4;
    	let form;
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let t3;
    	let div1;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let t7;
    	let div3;
    	let div2;
    	let label2;
    	let label3;
    	let t10;
    	let input2;
    	let t11;
    	let input3;
    	let t12;
    	let input4;
    	let t13;
    	let t14;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isErrorName*/ ctx[5] && create_if_block_2(ctx);
    	let if_block1 = /*isErrorNum*/ ctx[7] && create_if_block_1(ctx);
    	let if_block2 = (/*isErrorMonth*/ ctx[9] || /*isErrorYear*/ ctx[10] || /*isErrorCvc*/ ctx[12]) && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Cardholder Name";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Card Number";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			div3 = element("div");
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Exp. Date (MM/YY)";
    			label3 = element("label");
    			label3.textContent = "CVC";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			input3 = element("input");
    			t12 = space();
    			input4 = element("input");
    			t13 = space();
    			if (if_block2) if_block2.c();
    			t14 = space();
    			button = element("button");
    			button.textContent = "Confirm";
    			attr_dev(label0, "for", "c-name");
    			attr_dev(label0, "class", "svelte-imex1w");
    			add_location(label0, file$2, 182, 6, 4604);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "c-name");
    			attr_dev(input0, "placeholder", "e.g. Jane Appleseed");
    			attr_dev(input0, "class", "svelte-imex1w");
    			toggle_class(input0, "outline-error", /*isErrorName*/ ctx[5]);
    			add_location(input0, file$2, 183, 6, 4655);
    			attr_dev(div0, "class", "input-group");
    			add_location(div0, file$2, 181, 4, 4571);
    			attr_dev(label1, "for", "c-number");
    			attr_dev(label1, "class", "svelte-imex1w");
    			add_location(label1, file$2, 196, 6, 5003);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "id", "c-number");
    			attr_dev(input1, "placeholder", "e.g. 1234 5678 9123 0000");
    			attr_dev(input1, "maxlength", "16");
    			attr_dev(input1, "class", "svelte-imex1w");
    			toggle_class(input1, "outline-error", /*isErrorNum*/ ctx[7]);
    			add_location(input1, file$2, 197, 6, 5052);
    			attr_dev(div1, "class", "input-group");
    			add_location(div1, file$2, 195, 4, 4970);
    			attr_dev(label2, "for", "exp-month");
    			attr_dev(label2, "class", "two-column svelte-imex1w");
    			add_location(label2, file$2, 213, 8, 5502);
    			attr_dev(label3, "for", "cvc");
    			attr_dev(label3, "class", "svelte-imex1w");
    			add_location(label3, file$2, 214, 9, 5579);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "exp-month");
    			attr_dev(input2, "placeholder", "MM");
    			attr_dev(input2, "maxlength", "2");
    			attr_dev(input2, "class", "svelte-imex1w");
    			toggle_class(input2, "outline-error", /*isErrorMonth*/ ctx[9]);
    			add_location(input2, file$2, 215, 8, 5617);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "id", "exp-year");
    			attr_dev(input3, "placeholder", "YY");
    			attr_dev(input3, "maxlength", "2");
    			attr_dev(input3, "class", "svelte-imex1w");
    			toggle_class(input3, "outline-error", /*isErrorYear*/ ctx[10]);
    			add_location(input3, file$2, 224, 8, 5863);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "id", "cvc");
    			attr_dev(input4, "placeholder", "e.g. 123");
    			attr_dev(input4, "maxlength", "3");
    			attr_dev(input4, "class", "svelte-imex1w");
    			toggle_class(input4, "outline-error", /*isErrorCvc*/ ctx[12]);
    			add_location(input4, file$2, 233, 8, 6105);
    			attr_dev(div2, "class", "grid-group svelte-imex1w");
    			add_location(div2, file$2, 212, 6, 5468);
    			attr_dev(div3, "class", "input-group");
    			add_location(div3, file$2, 211, 4, 5435);
    			attr_dev(button, "class", "svelte-imex1w");
    			add_location(button, file$2, 252, 4, 6608);
    			attr_dev(form, "class", "svelte-imex1w");
    			add_location(form, file$2, 180, 2, 4559);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file$2, 179, 0, 4532);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, form);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*cName*/ ctx[0]);
    			append_dev(div0, t2);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(form, t3);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t5);
    			append_dev(div1, input1);
    			set_input_value(input1, /*cNumber*/ ctx[1]);
    			append_dev(div1, t6);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(form, t7);
    			append_dev(form, div3);
    			append_dev(div3, div2);
    			append_dev(div2, label2);
    			append_dev(div2, label3);
    			append_dev(div2, t10);
    			append_dev(div2, input2);
    			set_input_value(input2, /*expMonth*/ ctx[2]);
    			append_dev(div2, t11);
    			append_dev(div2, input3);
    			set_input_value(input3, /*expYear*/ ctx[3]);
    			append_dev(div2, t12);
    			append_dev(div2, input4);
    			set_input_value(input4, /*cvc*/ ctx[4]);
    			append_dev(div2, t13);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(form, t14);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[21]),
    					listen_dev(input0, "blur", /*IsValidName*/ ctx[15], false, false, false),
    					listen_dev(input1, "blur", /*IsValidCreditCard*/ ctx[16], false, false, false),
    					listen_dev(input1, "focus", /*stripSpaces*/ ctx[14], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[22]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[23]),
    					listen_dev(input2, "blur", /*IsValidExpMonth*/ ctx[17], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[24]),
    					listen_dev(input3, "blur", /*IsValidExpYear*/ ctx[18], false, false, false),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[25]),
    					listen_dev(input4, "blur", /*IsValidCvc*/ ctx[19], false, false, false),
    					listen_dev(button, "click", prevent_default(/*handleConfirm*/ ctx[20]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cName*/ 1 && input0.value !== /*cName*/ ctx[0]) {
    				set_input_value(input0, /*cName*/ ctx[0]);
    			}

    			if (dirty & /*isErrorName*/ 32) {
    				toggle_class(input0, "outline-error", /*isErrorName*/ ctx[5]);
    			}

    			if (/*isErrorName*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*cNumber*/ 2 && input1.value !== /*cNumber*/ ctx[1]) {
    				set_input_value(input1, /*cNumber*/ ctx[1]);
    			}

    			if (dirty & /*isErrorNum*/ 128) {
    				toggle_class(input1, "outline-error", /*isErrorNum*/ ctx[7]);
    			}

    			if (/*isErrorNum*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*expMonth*/ 4 && input2.value !== /*expMonth*/ ctx[2]) {
    				set_input_value(input2, /*expMonth*/ ctx[2]);
    			}

    			if (dirty & /*isErrorMonth*/ 512) {
    				toggle_class(input2, "outline-error", /*isErrorMonth*/ ctx[9]);
    			}

    			if (dirty & /*expYear*/ 8 && input3.value !== /*expYear*/ ctx[3]) {
    				set_input_value(input3, /*expYear*/ ctx[3]);
    			}

    			if (dirty & /*isErrorYear*/ 1024) {
    				toggle_class(input3, "outline-error", /*isErrorYear*/ ctx[10]);
    			}

    			if (dirty & /*cvc*/ 16 && input4.value !== /*cvc*/ ctx[4]) {
    				set_input_value(input4, /*cvc*/ ctx[4]);
    			}

    			if (dirty & /*isErrorCvc*/ 4096) {
    				toggle_class(input4, "outline-error", /*isErrorCvc*/ ctx[12]);
    			}

    			if (/*isErrorMonth*/ ctx[9] || /*isErrorYear*/ ctx[10] || /*isErrorCvc*/ ctx[12]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					if_block2.m(div2, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
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

    function format(s) {
    	// add spaces for readability
    	return s.toString().replace(/\d{4}(?=.)/g, "$& ");
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $cardStore;
    	validate_store(cardStore, 'cardStore');
    	component_subscribe($$self, cardStore, $$value => $$invalidate(26, $cardStore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CardForm', slots, []);
    	const dispatch = createEventDispatcher();
    	let cName;
    	let cNumber;
    	let expMonth;
    	let expYear;
    	let cvc;

    	// helper functions for credit card number
    	const formatCreditCard = () => {
    		if (cNumber !== undefined) {
    			$$invalidate(1, cNumber = format(cNumber));
    		}
    	};

    	const stripSpaces = () => {
    		// take away spaces
    		try {
    			$$invalidate(1, cNumber = cNumber.replace(/ /g, ""));
    		} catch {
    			
    		}
    	};

    	// Error Handling -- communicate with html/css
    	let isErrorName = false;

    	let msgErrorName = "";
    	let isErrorNum = false;
    	let msgErrorNum = "";
    	let isErrorMonth = false;
    	let isErrorYear = false;
    	let msgErrorMonthYear = "";
    	let isErrorCvc = false;
    	let msgErrorCvc = "";

    	// calls all validation checks
    	// each validatin check also runs on on:blur
    	const IsValidData = () => {
    		if (IsValidName() && IsValidCreditCard() && IsValidExpMonth() && IsValidExpYear() && IsValidCvc()) return true; else return false;
    	};

    	const IsValidName = () => {
    		let valid = true;

    		if (cName === undefined) {
    			$$invalidate(5, isErrorName = true);
    			$$invalidate(6, msgErrorName = "Can't be blank");
    			valid = false;
    		} else if (cName.length < 6) {
    			$$invalidate(5, isErrorName = true);
    			$$invalidate(6, msgErrorName = "Must be at least six characters");
    			valid = false;
    		} else {
    			$$invalidate(5, isErrorName = false);
    			$$invalidate(6, msgErrorName = "");
    		}

    		return valid;
    	};

    	const IsValidCreditCard = () => {
    		// only allow numbers and spaces
    		stripSpaces();

    		const regex = new RegExp("^[0-9]*$");

    		function IsValidNum(s) {
    			return regex.test(s);
    		}

    		let valid = true;

    		if (!IsValidNum(cNumber)) {
    			$$invalidate(7, isErrorNum = true);
    			$$invalidate(8, msgErrorNum = "Wrong format, numbers only");
    			valid = false;
    		} else if (cNumber.length != 16) {
    			$$invalidate(7, isErrorNum = true);
    			$$invalidate(8, msgErrorNum = "Wrong format, less than 16 digits");
    			valid = false;
    		} else {
    			$$invalidate(7, isErrorNum = false);
    			$$invalidate(8, msgErrorNum = "");
    			formatCreditCard();
    		}

    		return valid;
    	};

    	const IsValidExpMonth = () => {
    		const reMonth = /^0[1-9]|1[0-2]$/;
    		let valid = true;

    		if (expMonth === undefined) {
    			$$invalidate(9, isErrorMonth = true);
    			$$invalidate(11, msgErrorMonthYear = "Can't be blank");
    			valid = false;
    		} else if (expMonth.length < 2) {
    			$$invalidate(9, isErrorMonth = true);
    			$$invalidate(11, msgErrorMonthYear = "Must be two digits");
    			valid = false;
    		} else if (!reMonth.test(expMonth)) {
    			$$invalidate(9, isErrorMonth = true);
    			$$invalidate(11, msgErrorMonthYear = "Not a valid month");
    			valid = false;
    		} else {
    			$$invalidate(9, isErrorMonth = false);
    			$$invalidate(11, msgErrorMonthYear = "");
    		}

    		return valid;
    	};

    	const IsValidExpYear = () => {
    		const reYear = /^[0-9][0-9]$/;
    		let valid = true;

    		if (expYear === undefined) {
    			$$invalidate(10, isErrorYear = true);
    			$$invalidate(11, msgErrorMonthYear = "Can't be blank");
    			valid = false;
    		} else if (expYear.length < 2) {
    			$$invalidate(10, isErrorYear = true);
    			$$invalidate(11, msgErrorMonthYear = "Must be two digits");
    			valid = false;
    		} else if (!reYear.test(expYear)) {
    			$$invalidate(10, isErrorYear = true);
    			$$invalidate(11, msgErrorMonthYear = "Not a valid year");
    			valid = false;
    		} else {
    			$$invalidate(10, isErrorYear = false);
    			if (!isErrorMonth) $$invalidate(11, msgErrorMonthYear = "");
    		}

    		return valid;
    	};

    	const IsValidCvc = () => {
    		const reCvc = /^[0-9][0-9][0-9]$/;
    		let valid = true;

    		if (cvc === undefined) {
    			$$invalidate(12, isErrorCvc = true);
    			$$invalidate(13, msgErrorCvc = "Can't be blank");
    			valid = false;
    		} else if (cvc.length === 0) {
    			$$invalidate(12, isErrorCvc = true);
    			$$invalidate(13, msgErrorCvc = "Can't be blank");
    			valid = false;
    		} else if (cvc.length < 3) {
    			$$invalidate(12, isErrorCvc = true);
    			$$invalidate(13, msgErrorCvc = "Must be three digits");
    			valid = false;
    		} else if (!reCvc.test(cvc)) {
    			$$invalidate(12, isErrorCvc = true);
    			$$invalidate(13, msgErrorCvc = "Not a valid CVC");
    			valid = false;
    		} else {
    			$$invalidate(12, isErrorCvc = false);
    			$$invalidate(13, msgErrorCvc = "");
    		}

    		return valid;
    	};

    	const handleConfirm = () => {
    		if (IsValidData()) {
    			dispatch("confirm", "success");
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CardForm> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		cName = this.value;
    		$$invalidate(0, cName);
    	}

    	function input1_input_handler() {
    		cNumber = this.value;
    		$$invalidate(1, cNumber);
    	}

    	function input2_input_handler() {
    		expMonth = this.value;
    		$$invalidate(2, expMonth);
    	}

    	function input3_input_handler() {
    		expYear = this.value;
    		$$invalidate(3, expYear);
    	}

    	function input4_input_handler() {
    		cvc = this.value;
    		$$invalidate(4, cvc);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		cardStore,
    		cName,
    		cNumber,
    		expMonth,
    		expYear,
    		cvc,
    		formatCreditCard,
    		format,
    		stripSpaces,
    		isErrorName,
    		msgErrorName,
    		isErrorNum,
    		msgErrorNum,
    		isErrorMonth,
    		isErrorYear,
    		msgErrorMonthYear,
    		isErrorCvc,
    		msgErrorCvc,
    		IsValidData,
    		IsValidName,
    		IsValidCreditCard,
    		IsValidExpMonth,
    		IsValidExpYear,
    		IsValidCvc,
    		handleConfirm,
    		$cardStore
    	});

    	$$self.$inject_state = $$props => {
    		if ('cName' in $$props) $$invalidate(0, cName = $$props.cName);
    		if ('cNumber' in $$props) $$invalidate(1, cNumber = $$props.cNumber);
    		if ('expMonth' in $$props) $$invalidate(2, expMonth = $$props.expMonth);
    		if ('expYear' in $$props) $$invalidate(3, expYear = $$props.expYear);
    		if ('cvc' in $$props) $$invalidate(4, cvc = $$props.cvc);
    		if ('isErrorName' in $$props) $$invalidate(5, isErrorName = $$props.isErrorName);
    		if ('msgErrorName' in $$props) $$invalidate(6, msgErrorName = $$props.msgErrorName);
    		if ('isErrorNum' in $$props) $$invalidate(7, isErrorNum = $$props.isErrorNum);
    		if ('msgErrorNum' in $$props) $$invalidate(8, msgErrorNum = $$props.msgErrorNum);
    		if ('isErrorMonth' in $$props) $$invalidate(9, isErrorMonth = $$props.isErrorMonth);
    		if ('isErrorYear' in $$props) $$invalidate(10, isErrorYear = $$props.isErrorYear);
    		if ('msgErrorMonthYear' in $$props) $$invalidate(11, msgErrorMonthYear = $$props.msgErrorMonthYear);
    		if ('isErrorCvc' in $$props) $$invalidate(12, isErrorCvc = $$props.isErrorCvc);
    		if ('msgErrorCvc' in $$props) $$invalidate(13, msgErrorCvc = $$props.msgErrorCvc);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*cName*/ 1) {
    			set_store_value(cardStore, $cardStore.name = cName, $cardStore);
    		}

    		if ($$self.$$.dirty & /*cNumber*/ 2) {
    			set_store_value(cardStore, $cardStore.number = cNumber, $cardStore);
    		}

    		if ($$self.$$.dirty & /*expMonth*/ 4) {
    			set_store_value(cardStore, $cardStore.month = expMonth, $cardStore);
    		}

    		if ($$self.$$.dirty & /*expYear*/ 8) {
    			set_store_value(cardStore, $cardStore.year = expYear, $cardStore);
    		}

    		if ($$self.$$.dirty & /*cvc*/ 16) {
    			set_store_value(cardStore, $cardStore.cvc = cvc, $cardStore);
    		}
    	};

    	return [
    		cName,
    		cNumber,
    		expMonth,
    		expYear,
    		cvc,
    		isErrorName,
    		msgErrorName,
    		isErrorNum,
    		msgErrorNum,
    		isErrorMonth,
    		isErrorYear,
    		msgErrorMonthYear,
    		isErrorCvc,
    		msgErrorCvc,
    		stripSpaces,
    		IsValidName,
    		IsValidCreditCard,
    		IsValidExpMonth,
    		IsValidExpYear,
    		IsValidCvc,
    		handleConfirm,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class CardForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardForm",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\CompletedMessage.svelte generated by Svelte v3.53.1 */

    const file$1 = "src\\components\\CompletedMessage.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let h2;
    	let t2;
    	let p;
    	let t4;
    	let a;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Thank You!";
    			t2 = space();
    			p = element("p");
    			p.textContent = "We've added your card details";
    			t4 = space();
    			a = element("a");
    			a.textContent = "Continue";
    			if (!src_url_equal(img.src, img_src_value = "/images/icon-complete.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "check mark");
    			attr_dev(img, "class", "svelte-1yeosca");
    			add_location(img, file$1, 4, 2, 50);
    			attr_dev(h2, "class", "svelte-1yeosca");
    			add_location(h2, file$1, 5, 2, 110);
    			attr_dev(p, "class", "svelte-1yeosca");
    			add_location(p, file$1, 6, 2, 133);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "btn svelte-1yeosca");
    			add_location(a, file$1, 7, 2, 173);
    			attr_dev(div, "class", "container svelte-1yeosca");
    			add_location(div, file$1, 3, 0, 23);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, h2);
    			append_dev(div, t2);
    			append_dev(div, p);
    			append_dev(div, t4);
    			append_dev(div, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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
    	validate_slots('CompletedMessage', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CompletedMessage> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CompletedMessage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompletedMessage",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.53.1 */
    const file = "src\\App.svelte";

    // (17:4) {:else}
    function create_else_block(ctx) {
    	let cardform;
    	let current;
    	cardform = new CardForm({ $$inline: true });
    	cardform.$on("confirm", /*handleConfirm*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(cardform.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(cardform, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cardform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cardform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(cardform, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(17:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (15:4) {#if isComplete}
    function create_if_block(ctx) {
    	let completedmessage;
    	let current;
    	completedmessage = new CompletedMessage({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(completedmessage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(completedmessage, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(completedmessage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(completedmessage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(completedmessage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:4) {#if isComplete}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let cardpreview;
    	let t;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	cardpreview = new CardPreview({ $$inline: true });
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isComplete*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			create_component(cardpreview.$$.fragment);
    			t = space();
    			div1 = element("div");
    			if_block.c();
    			attr_dev(div0, "class", "dummy svelte-na5jso");
    			add_location(div0, file, 10, 2, 304);
    			attr_dev(div1, "class", "dummy svelte-na5jso");
    			add_location(div1, file, 13, 2, 358);
    			attr_dev(main, "class", "svelte-na5jso");
    			add_location(main, file, 9, 0, 294);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			mount_component(cardpreview, div0, null);
    			append_dev(main, t);
    			append_dev(main, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cardpreview.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cardpreview.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(cardpreview);
    			if_blocks[current_block_type_index].d();
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
    	let isComplete = false;

    	const handleConfirm = () => {
    		$$invalidate(0, isComplete = true);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CardPreview,
    		CardForm,
    		CompletedMessage,
    		isComplete,
    		handleConfirm
    	});

    	$$self.$inject_state = $$props => {
    		if ('isComplete' in $$props) $$invalidate(0, isComplete = $$props.isComplete);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isComplete, handleConfirm];
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
    		// name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
