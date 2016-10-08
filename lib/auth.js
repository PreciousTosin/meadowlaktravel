var User = require('../models/user.js'),
	passport = require('passport'),
	LocalStrategy   = require('passport-local').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	TwitterStrategy  = require('passport-twitter').Strategy;

passport.serializeUser(function(user, done){
	done(null, user._id);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		if(err || !user) return done(err, null);
		done(null, user);
	});
});

module.exports = function(app, options){

	// if success and failure redirects aren't specified,
	// set some reasonable defaults
	if(!options.successRedirect)
		options.successRedirect = '/accountTP';
	if(!options.failureRedirect)
		options.failureRedirect = '/register';

	return {

		init: function() {
			var env = app.get('env');
			var config = options.providers;

			// configure Facebook strategy
			passport.use(new FacebookStrategy({
				clientID: config.facebook[env].appId,
				clientSecret: config.facebook[env].appSecret,
				callbackURL: (options.baseUrl || '') + '/auth/facebook/callback',
			}, function(accessToken, refreshToken, profile, done){
				var authId = 'facebook:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						email:profile.email,
						created: Date.now(),
						role: 'customer',
					});
					
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

			passport.use(new GoogleStrategy({
				clientID: config.google[env].clientId,
				clientSecret: config.google[env].clientSecret,
				callbackURL: (options.baseUrl || '') + '/auth/google/callback',
			}, function(token, tokenSecret, profile, done){
				var authId = 'google:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						email:profile.email,
						created: Date.now(),
						role: 'customer',
					});
					/*user = new User({
							google:{
								authId:authId,
								name:profile.displayName,
								created:Date.now(),
								role: 'customer',
								token:token,
							}});*/
					
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

			passport.use(new TwitterStrategy({
				consumerKey: config.twitter[env].consumerKey,
				consumerSecret: config.twitter[env].consumerSecret,
				callbackURL: (options.baseUrl || '') + '/auth/twitter/callback',
			}, function(token, tokenSecret, profile, done){
				var authId = 'twitter:' + profile.id;
				User.findOne({ authId: authId }, function(err, user){
					if(err) return done(err, null);
					if(user) return done(null, user);
					user = new User({
						authId: authId,
						name: profile.displayName,
						email:profile.email,
						created: Date.now(),
						role: 'customer',
					});
					
					user.save(function(err){
						if(err) return done(err, null);
						done(null, user);
					});
				});
			}));

			passport.use('local-signup', new LocalStrategy({
				usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true, // allows us to pass back the entire request to the callback
			}, function(req, email, password, done){
					process.nextTick(function() {

						User.findOne({email: email}, function(err, user) {
							if(err) return done(err, null);
							if(user) return done(null, user);
							
							user = new User();
								user.authId = 'local:' +  Math.random().toString().replace(/^0\.0*/, ''),
								user.name = req.body.name,
								user.email = email,
								user.password = user.generateHash(password),
								user.created = Date.now(),
								user.role = 'customer',
								
							
							user.save(function(err){
								if(err) return done(err, null);
								done(null, user);
							});
						});
					});
			}));

			passport.use('local-login', new LocalStrategy({
				usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true, // allows us to pass back the entire request to the callback
			}, function(req, email, password, done){
						User.findOne({email: email}, function(err, user) {
							// if there are any errors, return the error before anything else
							if(err) return done(err, null);
							// if no user is found, return the message
							if (!user){
								req.session.flash = {
	                type: 'danger',
	                intro: 'Ooops!',
	                message: 'No User found, Incorrect email.',
	            	};
                return done(null, false);
              }
              // if the user is found but the password is wrong
							if (!user.validPassword(password)){
								req.session.flash = {
	                type: 'danger',
	                intro: 'Ooops!',
	                message: 'Your Password is wrong.',
	            	};
                return done(null, false);
              }
              // all is well, return successful user
            	return done(null, user);
						});
			}));

			app.use(passport.initialize());
			app.use(passport.session()); // persistent login sessions
		},

		registerRoutes: function(){
			// register Facebook routes
			app.get('/auth/facebook', function(req, res, next){
				if(req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('facebook')(req, res, next);
			});
			app.get('/auth/facebook/callback', passport.authenticate('facebook', 
				{ failureRedirect: options.failureRedirect }),
				function(req, res){
					// we only get here on successful authentication
					var redirect = req.session.authRedirect;
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, redirect || options.successRedirect);
				}
			);

			// register Google routes
			app.get('/auth/google', function(req, res, next){
				if(req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('google', { scope: 'profile' })(req, res, next);
			});
			app.get('/auth/google/callback', passport.authenticate('google', 
				{ failureRedirect: options.failureRedirect }),
				function(req, res){
					// we only get here on successful authentication
					var redirect = req.session.authRedirect;
					console.log(redirect);
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, req.query.redirect || options.successRedirect);
				}
			);

			// register Twitter routes
			app.get('/auth/twitter', function(req, res, next){
				if(req.query.redirect) req.session.authRedirect = req.query.redirect;
				passport.authenticate('twitter', { scope: 'profile' })(req, res, next);
			});
			app.get('/auth/twitter/callback', passport.authenticate('twitter', 
				{ failureRedirect: options.failureRedirect }),
				function(req, res){
					// we only get here on successful authentication
					var redirect = req.session.authRedirect;
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, req.query.redirect || options.successRedirect);
				}
			);

			// route for logging out
		  app.get('/logout', function(req, res) {
		    req.logout();
		    res.redirect('/');
		  });

		  // process the signup form
    	/*app.post('/signup', passport.authenticate('local-signup',
    		{ failureRedirect: options.failureRedirect }),
				function(req, res){
					// we only get here on successful authentication
					var redirect = req.session.authRedirect;
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, req.query.redirect || options.successRedirect);
				}
			); */

			app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/customer/register', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
      })); 

		// process the login form
    	app.post('/login', passport.authenticate('local-login',
    		{ failureRedirect: options.failureRedirect }),
				function(req, res){
					// we only get here on successful authentication
					var redirect = req.session.authRedirect;
					console.log(redirect);
					if(redirect) delete req.session.authRedirect;
					res.redirect(303, req.query.redirect || '/accountLoc');
				}
			);
			
			// process the login form
    /*app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/account', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));*/
		},

	};
};
