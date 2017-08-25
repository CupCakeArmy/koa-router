const
	assert = require('assert'),
	http = require('http'),
	Koa = require('koa'),
	router = require('./Router'),
	port = 3000

let app, server, v = new Array(10)

function checkRes(options, should) {
	return new Promise((resolve, reject) => {
		http.request(options, (res) => {
			res.setEncoding('utf8');
			let d = ''
			res.on('data', chunk => d += chunk)
			res.on('end', () => {
				res.body = d
				for (const attr in should)
					assert.equal(res[attr], should[attr])
				resolve()
			})
		}).end()
	})
}

describe('Router', () => {

	beforeEach(() => {
		app = new Koa()
		for (let i = 0; i < v.length; ++i)
			v[i] = Math.random().toString()
	})

	afterEach(() => {
		server.close()
	})

	it('Simple Test', () => {
		app.use(router(_ => {
			_.get('/user/:a', c => c.body = c.request.params['a'])
		}))
		server = app.listen(port)

		return checkRes({
			port: port,
			path: `/user/${v[0]}`,
		}, {
			statusCode: 200,
			body: v[0]
		})
	})

	describe('Options & Modes', () => {
		it('No', () => {
			app.use(router(_ => {
				_.get('/mypath', c => c.body = v[0])
			}))
			server = app.listen(port)

			return checkRes({
				port: port,
				path: `/mypath`,
			}, {
				statusCode: 200,
				body: v[0]
			})
		})

		it('String', () => {
			app.use(router('/myprefix', _ => {
				_.get('/mypath', c => c.body = v[0])
			}))
			server = app.listen(port)

			return checkRes({
				port: port,
				path: `/myprefix/mypath`,
			}, {
				statusCode: 200,
				body: v[0]
			})
		})
		it('Full', () => {
			app.use(router({
				prefix: '/myprefix',
				case: true,
				end: true
			}, _ => {
				_.get('/myPath', c => c.body = v[0])
			}))
			server = app.listen(port)

			return Promise.all([
				checkRes({
					port: port,
					path: `/myprefix/myPath`,
				}, {
					statusCode: 200,
					body: v[0]
				}),
				checkRes({
					port: port,
					path: `/myprefix/mypath`,
				}, {
					statusCode: 404
				}),
				checkRes({
					port: port,
					path: `/myprefix/mypath/`,
				}, {
					statusCode: 404
				})
			])
		})
	})

	describe('Nesting', () => {
		it('Simple', () => {
			app.use(router(_ => {
				_.nest(router('/l1', _ => {
					_.get('/l2', c => c.body = v[1])

					_.get('/l3', c => c.body = v[2])

					_.nest(router('/l3', _ => {
						_.get('/l4', c => c.body = v[3])
					}))
				}))
				_.get('/', c => c.body = v[0])
			}))
			server = app.listen(port)

			return Promise.all([
				checkRes({
					port: port,
					path: `/`,
				}, {
					statusCode: 200,
					body: v[0]
				}),
				checkRes({
					port: port,
					path: `/l1/l2`,
				}, {
					body: v[1]
				}),
				checkRes({
					port: port,
					path: `/l1/l3`,
				}, {
					body: v[2]
				}),
				checkRes({
					port: port,
					path: `/l1/l3/l4`,
				}, {
					body: v[3]
				})
			])
		})

		it('Parameters', () => {
			app.use(router(_ => {
				_.nest(router('/l1', _ => {
					_.get('/l2/:a', c => c.body = c.request.params['a'])
				}))
			}))
			server = app.listen(port)

			return Promise.all([
				checkRes({
					port: port,
					path: `/l1/l2/${v[0]}`,
				}, {
					statusCode: 200,
					body: v[0]
				})
			])
		})
	})

	describe('Methods', () => {
		it('Priority', () => {
			app.use(router(_ => {
				_.get('/', c => c.body = v[0])
				_.post('/', c => c.body = v[1])
				_.all('/', c => c.body = v[2])

			}))
			server = app.listen(port)

			return Promise.all([
				checkRes({
					port: port,
					method: 'GET'
				}, {
					statusCode: 200,
					body: v[0]
				}),
				checkRes({
					port: port,
					method: 'POST'
				}, {
					statusCode: 200,
					body: v[1]
				}),
				checkRes({
					port: port,
					method: 'PUT'
				}, {
					statusCode: 200,
					body: v[2]
				})
			])
		})
	})

	describe('Routing', () => {
		it('Logic', () => {
			app.use(router(_ => {
				_.get('/', c => c.body = v[0])
				_.get('/l1', c => c.body = v[1])
				_.all('/l1/', c => c.body = v[2])

			}))
			server = app.listen(port)

			return Promise.all([
				checkRes({
					port: port,
					path: '/'
				}, {
					statusCode: 200,
					body: v[0]
				}),
				checkRes({
					port: port,
					path: '/l1'
				}, {
					statusCode: 200,
					body: v[1]
				}), checkRes({
					port: port,
					path: '/l1/'
				}, {
					statusCode: 200,
					body: v[2]
				})
			])
		})
	})
})