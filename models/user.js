/*var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');


var userSchema = mongoose.Schema({
	local: {
		authId:String,
        email: String,
        password: String,
        role: String,
        created: Date,
    },
    facebook: {
        authId:String,
        name: String,
        email: String,
        token: String,
        role: String,
        created: Date,
    },
    twitter: {
        authId:String,
        name: String,
        email: String,
        token: String,
        role: String,
        created: Date,
    },
    google: {
        authId:String,
        name: String,
        email: String,
        token: String,
        role: String,
        created: Date,
    }
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);*/

var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');


var userSchema = mongoose.Schema({
	authId: String,
	name: String,
	email: String,
	password: String,
	role: String,
	created: Date,
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

var User = mongoose.model('User', userSchema);
module.exports = User;
