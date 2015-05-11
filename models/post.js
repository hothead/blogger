let mongoose = require('mongoose')

require('songbird')

let postSchema = mongoose.Schema({
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
	}
})

module.exports = mongoose.model('Post', postSchema)
