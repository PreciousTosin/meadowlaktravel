exports.registerUser = function(req, res) {
  // render the page and pass in any flash data if it exists
  req.session.flash = {
	  type: 'success',
	  intro: 'Welcome!',
	  message: 'Please fill in all fields.',
	};
	res.locals.flash = req.session.flash;
  res.render('signup');  
}

exports.loginUser = function(req, res) {
  // render the page and pass in any flash data if it exists
  req.session.flash = {
	  type: 'success',
	  intro: 'Welcome!',
	  message: 'Supply your email and password.',
	};
	res.locals.flash = req.session.flash;
  res.render('login'); 
}