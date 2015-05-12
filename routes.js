let fs = require('fs')
let DataUri = require('datauri')
let multiparty = require('multiparty')
let then = require('express-then')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let User = require('./models/user')

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

	app.get('/profile', isLoggedIn, then(async (req, res) => {
		let query = Post.find({blog: req.user.blogTitle}).sort({createDate: -1})
		let posts = await query.exec()

		res.render('profile.ejs', {
			user: req.user,
			posts: posts,
			message: req.flash('error')
		})
	}))

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

	app.post('/post/:postId?', isLoggedIn, then(async (req, res) => {
		let postId = req.params.postId
		let [{title: [title], content: [content]}, {image: [file]}] =
				await new multiparty.Form().promise.parse(req)

		if (!postId) {
			let post = new Post()
			post.blog = req.user.blogTitle
			post.title = title
			post.content = content
			if (file) {
				post.image.data = await fs.promise.readFile(file.path)
				post.image.contentType = file.headers['content-type']
				post.imageBase64 = new DataUri().format('.'+post.image.contentType.split('/').pop(), post.image.data).base64
			}
			await post.save()
			res.redirect('/profile')
			return
		}

		let post = await Post.promise.findById(postId)
		if (!post) res.send(404, 'Post not found')

		post.blog = req.user.blogTitle
		post.title = title
		post.content = content
		post.updateDate = new Date()
		if (file) {
			post.image.data = await fs.promise.readFile(file.path)
			post.image.contentType = file.headers['content-type']
			post.imageBase64 = new DataUri().format('.'+post.image.contentType.split('/').pop(), post.image.data).base64
		}
		await post.save()
		res.redirect('/profile')
	}))

	app.get('/delete/:postId', isLoggedIn, then(async (req, res) => {
		let postId = req.params.postId
		let post = await Post.promise.findByIdAndRemove(postId)
		if (!post) res.send(404, 'Post not found')

		res.redirect('/profile')
	}))

	app.get('/blog/:blogId?', then(async (req, res) => {
		let blogId = req.params.blogId
		if (!blogId) {
			res.send(404, 'Blog not found')
		}

		blogId = decodeURI(blogId)
		let user = await User.promise.findOne({blogTitle: blogId})
		let query = Post.find({blog: blogId}).sort({createDate: -1})
		let posts = await query.exec()

		if (!user || !posts) res.send(404, 'Blog not found')

		res.render('blog.ejs', {
			req: req,
			user: user,
			posts: posts
		})
	}))

	app.post('/comment/:postId/:blogId?', isLoggedIn, then(async (req, res) => {
		let postId = req.params.postId
		let blogId = req.params.blogId
		let [{comment: [comment]}] = await new multiparty.Form().promise.parse(req)

		if (comment) {
			let post = await Post.promise.findByIdAndUpdate(postId,
				{$push: {comments: { body: comment, username: req.user.username, date: new Date() }}})
			if (!post) res.send(404, 'Post not found')
		}
		// return from where we came
		if (blogId) {
			res.redirect('/blog/'+blogId)
		} else {
			res.redirect('/profile')
		}
	}))
}
