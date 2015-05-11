let fs = require('fs')
let DataUri = require('datauri')
let multiparty = require('multiparty')
let then = require('express-then')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')

module.exports = (app) => {
	let passport = app.passport

	app.get('/', (req, res) => {
		res.render('index.ejs')
	})

	// process the login
	app.get('/login', (req, res) => {
		res.render('login.ejs', {message: req.flash('error')})
	})
	app.post('/login', passport.authenticate('local', {
		successRedirect: '/profile',
		failureRedirect: '/login',
		failureFlash: true
	}))

	// process the signup
	app.get('/signup', (req, res) => {
		res.render('signup.ejs', {message: req.flash('error')})
	})
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect: '/profile',
		failureRedirect: '/signup',
		failureFlash: true
	}))

	app.get('/profile', isLoggedIn, (req, res) => {
		res.render('profile.ejs', {
			user: req.user,
			message: req.flash('error')
		})
	})

	app.get('/logout', (req, res) => {
		req.logout()
		res.redirect('/')
	})

	app.get('/post/:postId?', then(async (req, res) => {
		let postId = req.params.postId
		if (!postId) {
			res.render('post.ejs', {
				post: {},
				verb: "Create"
			})
			return
		}

		let post = await Post.promise.findById(postId)
		if (!post) res.send(404, 'Post not found')

		let dataUri = new DataUri()
		let image = dataUri.format('.'+post.image.contentType.split('/').pop(), post.image.data)
		res.render('post.ejs', {
			post: post,
			verb: "Edit",
			image: `data:${post.image.contentType};base64,${image.base64}`
		})
	}))

	app.post('/post/:postId?', then(async (req, res) => {
		let postId = req.params.postId
		let [{title: [title], content: [content]}, {image: [file]}] =
				await new multiparty.Form().promise.parse(req)

		if (!postId) {
			let post = new Post()

			// let [{title: [title], content: [content]}, {image: [file]}] =
			// 		await new multiparty.Form().promise.parse(req)

			post.title = title
			post.content = content
			post.image.data = await fs.promise.readFile(file.path)
			post.image.contentType = file.headers['content-type']
			await post.save()
			res.redirect('/blog/' + encodeURI(req.user.blogTitle))
			return
		}

		let post = await Post.promise.findById(postId)
		if (!post) res.send(404, 'Post not found')

		post.title = title
		post.content = content
		post.image.data = await fs.promise.readFile(file.path)
		post.image.contentType = file.headers['content-type']
		await post.save()
		res.redirect('/blog/' + encodeURI(req.user.blogTitle))
	}))
}
