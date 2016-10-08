var Customer = require('../models/customer.js');
var customerViewModel = require('../viewModels/customer.js');
var authorize = require('../lib/authorize.js');

module.exports = {

	registerRoutes: function(app) {

		app.get('/customer/register',authorize.allow('customer'), this.register);
		app.post('/customer/register', this.processRegister);

		app.get('/customer/:id', authorize.allow('customer,employee'), this.home);
		app.get('/customer/:id/preferences', this.preferences);
		app.get('/orders/:id',authorize.allow('customer'), this.orders);

		app.get('/formupdateid', this.formUpdateId);
		app.get('/customer/:id/edit', this.formUpdate);

		app.get('/ajaxupdateid', this.ajaxUpdateId);
		app.post('/customer/:id/update', this.ajaxUpdate);

		app.get('/readdata', this.readData);
	},

	register: function(req, res, next) {
		res.render('customer/register');		
	},

	processRegister: function(req, res, next) {
		// TODO: back-end validation (safety)
		var c = new Customer({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			address1: req.body.address1,
			address2: req.body.address2,
			city: req.body.city,
			state: req.body.state,
			zip: req.body.zip,
			phone: req.body.phone,
			userid: req.session.passport.user,
		});
		c.save(function(err) {
			if(err) return next(err);
			//res.redirect(303, '/customer/' + c._id);
			res.redirect(303, '/accountLoc');
		});
	},

	home: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/home', customerViewModel(customer, orders));
			});
		});
	},

	preferences: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/preferences', customerViewModel(customer, orders));
			});
		});
	},

	orders: function(req, res, next) {
		Customer.findById(req.params.id, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/preferences', customerViewModel(customer, orders));
			});
		});
	},

	//obtain customer data from database
	readData:function(req, res, next){
		Customer.findOne({ 'userid': req.session.passport.user }, function(err, customer) {
			var customer = customer;
			//res.send(customer);
			res.json(customer);
		});
	},

	//obtain customer id, then redirect to edit form
	formUpdateId: function(req, res, next){
		Customer.findOne({ 'userid': req.session.passport.user }, function(err, customer) {
			if(!customer) {
				return res.redirect('/customer/register');
			}
			var identity = customer._id;
			console.log(identity);
			res.redirect('/customer/'+identity+'/edit');
			//res.send(identity);
		});
	},

	//render the form to edit customer information
	formUpdate: function(req, res, next){
		res.render('customer/edit');
	},

	//retrieve customer id used to update customer record via ajax
	ajaxUpdateId: function(req, res, next){
		Customer.findOne({ 'userid': req.session.passport.user }, function(err, customer) {
			var identity = customer._id;
			var user = req.session.passport.user;
			console.log(identity);
			//res.redirect('/customer/'+identity+'/update');
			res.json(customer);
		});
	},

	//update information via ajax
	ajaxUpdate: function(req, res) {
		Customer.findById(req.params.id, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			if(req.body.firstName){
				if(typeof req.body.firstName !== 'string' ||
					req.body.firstName.trim() === '')
					return res.json({ error: 'Invalid name.'});
				customer.firstName = req.body.firstName;
			}
			// and so on....
			customer.save(function(err) {
				return err ? res.json({ error: 'Unable to update customer.' }) : res.json({ success: true });
			});
		});
	},
};
