let mongoose = require('mongoose')

require('songbird')

let postSchema = mongoose.Schema({
	blog: {
		type: String,
		required: true
	},
	title: {
		type: String,
		required: true
	},
	content: {
		type: String,
		required: true
	},
	image: {
		data: Buffer,
		contentType: String
	},
	imageBase64: String,
	createDate: {
		type: Date,
		default: Date.now
	},
	updateDate: Date,
	comments: [{ body: String, username: String, date: Date }]
})

module.exports = mongoose.model('Post', postSchema)
