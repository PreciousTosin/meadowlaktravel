var Dealer = require('../models/dealer.js');

	// initialize dealers

var dealer = Dealer.find({}, function(err, dealers){
		console.log('CALLED DEALERS');
	  if(dealers.length) return;
	    
	  new Dealer({
	    name: 'Oregon Novelties',
	    address1: '912 NW Davis St',
	    city: 'Portland',
	    state: 'OR',
	    zip: '97209',
	    country: 'US',
	    phone: '503-555-1212',
	    active: true,
	  }).save();

	  new Dealer({
	    name: 'Bruce\'s Bric-a-Brac',
	    address1: '159 Beeswax Ln',
	    city: 'Manzanita',
	    state: 'OR',
	    zip: '97209',
	    country: 'US',
	    phone: '503-555-1212',
	    active: true,
	  }).save();

	  new Dealer({
	    name: 'Aunt Beru\'s Oregon Souveniers',
	    address1: '544 NE Emerson Ave',
	    city: 'Bend',
	    state: 'OR',
	    zip: '97701',
	    country: 'US',
	    phone: '503-555-1212',
	    active: true,    
	  }).save();

	  new Dealer({
	    name: 'Oregon Goodies',
	    address1: '1353 NW Beca Ave',
	    city: 'Corvallis',
	    state: 'OR',
	    zip: '97330',
	    country: 'US',
	    phone: '503-555-1212',
	    active: true,
	  }).save();

	  new Dealer({
	    name: 'Oregon Grab-n-Fly',
	    address1: '7000 NE Airport Way',
	    city: 'Portland',
	    state: 'OR',
	    zip: '97219',
	    country: 'US',
	    phone: '503-555-1212',
	    active: true,
	  }).save();
	});

module.exports = dealer;