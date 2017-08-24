# Koa Router

[![npm](https://img.shields.io/npm/v/cca-koa-router.svg)](https://www.npmjs.com/package/cca-koa-router)
[![npm](https://img.shields.io/npm/dt/cca-koa-router.svg)]()
[![npm](https://img.shields.io/npm/l/cca-koa-router.svg)]()

Koa Router with support for recursive nesting and regexp and dynamic urls. No dependecies and lightweight code.

### Install
```bash
npm install cca-koa-router --save
```

### Simple Example
```javascript
const
	Koa = require('koa'),
	router = require('cca-koa-router')

const
	app = new Koa(),
	port = 3000

app.use(router(_ => {
	_.get('/user/:user', (c, n) => {
		c.body = c.request.params['user']
		// GET /user/foo => 'foo'
	})
}))

app.listen(port)
```

## Documentation

- [Options](#options)
- [Modes](#modes)
- [Nesting](#nesting)
- [Methods](#methods)
- [Parameters](#params)

##### ~ `router(options, builder)`

##### Options:

- `prefix` Prefix for the paths
- `end` If trailing paths sould be counted
- `case` Case sentitive

###### Default
```javascript
{
  prefix: '',
  end: false,
  case: false
}
```

##### Modes:
1. `router(builder)` No options specified, use default
2. `router('string', builder)` String will be taken as the prefix
3. `router({}, builder)` Specify custom options

###### Example
```javascript
// 1
app.use(router(_ => {
	_.get('/mypath', (c, n) => {
		// GET /mypath
		c.body = 'Some Response'
	})
}))

// 2
app.use(router('/myprefix', _ => {
	_.get('/mypath', (c, n) => {
		// GET /myprefix/mypath
		c.body = 'Some Response'
	})
}))

// 3
app.use(router({
	prefix: '/myprefix',
	case: true
}, _ => {
	_.get('/myPath', (c, n) => {
		// GET /myprefix/myPath
		c.body = 'Some Response'
	})
}))
````

##### Nesting
You can nest recursively `routers`. Each can have its own `options`.

###### Example

```javascript
app.use(router(_ => {
	_.nest(router('/user', _ => {
		_.get('/view', (c, n) => {
			c.body = 'View User'
		})

		_.get('/edit', (c, n) => {
			c.body = 'Edit User'
		})
	}))

	_.get('/', c => {
		c.body = 'Root'
	})
}))

/*
GET / => 'Root'
GET /user/view => 'View User'
GET /user/edit => 'Edit User'
*/
```

##### Methods
Supported methods:
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Special "methods":
- `ALL` Used if none other method is defined
- `NEST` Used to nest layers of the router

###### Example
```javascript
app.use(router(_ => {
	_.get('/path', c => {
		c.body = 'GET'
	})
	_.post('/path', c => {
		c.body = 'POST'
	})
	
	// ...
	
	_.delete('/path', c => {
		c.body = 'DELETE'
	})
}))
```

##### Params
The `router` suppors parametrs in the url/path. Parameters will be stored in the `ctx.request.params` object

###### Example
```javascript
app.use(router(_ => {
	_.get('/user/:user/:id/view/:type', (c, n) => {
		c.body = c.request.params
	})
}))

/*
GET /user/foo/123/view/active
=> 
{"user":"foo","id":"123","type":"active"}
*/
```