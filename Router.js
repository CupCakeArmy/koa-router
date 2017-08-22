const
	assert = require('assert')

const
	// Regex for the different parts
	reg_segment = new RegExp(`([A-z]|[0-9]|-|_|\\.|:)+`),
	reg_prefix = new RegExp(`^(\/${reg_segment.source})+$`),
	reg_url = new RegExp(`^(\/${reg_segment.source})+`),

	// Allowed methods
	METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL'],

	// Default Response
	defaultResponse = [async(c, n) => {
		await n()
	}, {}]

/**
 * Defaults an options object
 * @param {*} options 
 */
function defaultOptions(options) {
	return Object.assign({
		prefix: '',
		end: false,
		case: false
	}, options)
}

/**
 * Creates a regex from a path.
 * Options:
 * 	end
 * 	prefix
 *  case
 * @param {String} path 
 * @param {*} options 
 */
function pathToReg(path, options) {
	if (path instanceof RegExp)
		return path

	assert(typeof path === 'string', 'Path must be a String or RegExp')
	options = defaultOptions(options)

	// Test Path & Prefix
	assert(reg_url.test(path) || path === '/', 'Invalid Path')
	assert(reg_prefix.test(options.prefix) || options.prefix === '', 'Invalid Prefix')

	path = options.prefix + path

	let ret = '^'
	for (const seg of path.split('/').slice(1))
		// If segment starts with a ':' make it wildcard
		ret += '/' + (seg[0] === ':' ? reg_segment.source : seg)

	if (options.end)
		ret += '$'

	return new RegExp(ret, options.case ? '' : 'i')
}

/**
 * Gets the position of each parameter type and returns a map with it
 * @param {*} path 
 */
function pathToParams(path, options) {
	const
		offset = options.prefix.split('/').slice(1).length,
		params = new Map()

	let i = 0
	for (const seg of path.split('/').slice(1)) {
		if (seg[0] === ':')
			params.set(seg.slice(1), i + offset)
			++i
	}
	return params
}

/**
 * Takes the builder function and creates a map with all the routes in regex
 * @param {*} options 
 * @param {*} builder provided by user 
 */
function mkRouter(options, builder) {

	const
		routes = new Map(),
		routesKeys = new Map()

	// This object (routesMaker) will process the builder function
	let routesMaker = {
		nest: function () {
			// Join the lower paths with the current ones
			const nested = arguments[0](options.prefix)
			for (const key of nested.keys())
				routes.set(key, nested.get(key))
		}
	}

	// Add the other methods to the routesMaker object
	for (const method of METHODS)
		routesMaker[method.toLowerCase()] = function () {
			const data = {
				fn: arguments[1],
				params: pathToParams(arguments[0], options)
			}

			// If the same regex already exits, grab the object
			let key = pathToReg(arguments[0], options)
			if (routesKeys.has(key.source))
				key = routesKeys.get(key.source)
			else
				routesKeys.set(key.source, key)

			// Add the value into the object of GET, POST, etc.
			const current = routes.get(key) || {}
			let obj = {}
			obj[method] = data
			routes.set(key, Object.assign(current, obj))
		}

	// Build the routes, including the nested ones
	builder(routesMaker)

	return routes
}

/**
 * Chooses the right function for given path and method
 * @param {*} routes 
 * @param {*} path 
 * @param {*} method 
 */
function chooseFn(routes, path, method) {
	const
		candidates = new Map(),
		pathArr = path.split('/').slice(1),
		paramObj = {}

	for (const reg of routes.keys())
		if (reg.test(path))
			candidates.set(reg, routes.get(reg))

	// Choose the route
	let route = null
	if (candidates.size === 1)
		route = candidates.entries().next().value[1]
	else if (candidates.size > 1)
		// TODO route chooser
		route = candidates.entries().next().value[1]
	if (route === null)
		return defaultResponse

	// Choose method or ALL if specific method is not set, but ALL is
	let fn = route['ALL'] === undefined ? null : route['ALL']
	if (route[method.toUpperCase()] !== undefined)
		fn = route[method.toUpperCase()]
	if (fn === null)
		return defaultResponse

	// Get the parameters
	for (const key of fn.params.keys())
		paramObj[key] = pathArr[fn.params.get(key)]

	return [fn.fn, paramObj]
}

module.exports = function (options, builder) {

	// If only one argument was given
	if (typeof options === 'function' && builder === undefined) {
		builder = options
		options = {}
	}

	if (typeof options === 'string')
		options = {
			prefix: options
		}
	assert(options instanceof Object, 'Options can only be a string or object')
	options = defaultOptions(options)

	// Build the routes
	const routes = mkRouter(options, builder)

	return function (c, n) {
		// For building nested routes
		if (typeof c === 'string') {
			options.prefix = c + options.prefix
			return mkRouter(options, builder)
		}

		const fn = chooseFn(routes, c.request.url, c.request.method)
		c.request.params = fn[1]
		if (typeof fn[0] !== 'function')
			fn[0] = defaultResponse[0]
		return fn[0](c, n)
	}
}