var http = require('http'),
    https = require('https'),	
	  express = require('express'),
	  fs = require('fs'),
    vhost = require('vhost'),
    //flash    = require('connect-flash'),
    connect = require('connect'),
 	  formidable = require('formidable'),
	  bodyParser = require('body-parser'),
    Q = require('q'),
    //Dealer = require('./models/dealer.js'),
    Dealer = require('./database/dealers.js'),
//var jqupload = require('jquery-file-upload-middleware');
	session = require('express-session'),
	fortune = require('./lib/fortune.js'),
  authorize = require('./lib/authorize.js'),
	weather = require('./lib/weather.js');

var flash = require('express-flash');
var Vacation = require('./database/vacations.js');
    //Vacation = require('./models/vacation.js');
//var Vacation = require('./lib/vacation-initializer.js'); //initializes database collection
var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');
var credentials = require('./credentials.js');
var emailService = require('./lib/email.js')(credentials);

// twitter library
var twitter = require('./lib/twitter')({
    consumerKey: credentials.twitter.consumerKey,
    consumerSecret: credentials.twitter.consumerSecret,
});

var app = express();

// set up handlebars view engine
/*var handlebars = require('express3-handlebars')
	.create({ defaultLayout:'main' });
*/

var handlebars = require('express3-handlebars').create({
   defaultLayout:'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        static: function(name) {
            return require('./lib/static.js').map(name);
        }
    }
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// set up css/js bundling
var bundler = require('connect-bundle')(require('./config.js'));
app.use(bundler);

app.set('port', process.env.PORT || 8000);

// use domains for better error handling
app.use(function(req, res, next){
    // create a domain for this request
    var domain = require('domain').create();
    // handle errors on this domain
    domain.on('error', function(err){
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // failsafe shutdown in 5 seconds
            setTimeout(function(){
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            // disconnect from the cluster
            var worker = require('cluster').worker;
            if(worker) worker.disconnect();

            // stop taking new requests
            server.close();

            try {
                // attempt to use Express error route
                next(err);
            } catch(error){
                // if Express error route failed, try
                // plain Node response
                console.error('Express error mechanism failed.\n', error.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch(error){
            console.error('Unable to send 500 response.\n', error.stack);
        }
    });

    // add the request and response objects to the domain
    domain.add(req);
    domain.add(res);

    // execute the rest of the request chain in the domain
    domain.run(next);
});

// logging
switch(app.get('env')){
    case 'development':
    	// compact, colorful dev logging
    	app.use(require('morgan')('dev'));
        break;
    case 'production':
        // module 'express-logger' supports daily log rotation
        app.use(require('express-logger')({ path: __dirname + '/log/requests.log'}));
        break;
}

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo[app.get('env')].connectionString });

var connectApp = connect()
    .use( bodyParser.urlencoded( { extended: true } ) )
    .use( bodyParser.json() );

//used to serve static files in the public folder
app.use(express.static(__dirname + '/public'));

//app.use(flash()); // use connect-flash for flash messages stored in session

//for form handling
//app.use(require('body-parser')());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//for cookies
app.use(require('cookie-parser')(credentials.cookieSecret));
//for sessions
//app.use(require('express-session')());
//app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: credentials.cookieSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
}));

//flash
app.use(flash());   

app.use(require('csurf')());
app.use(function(req, res, next) {
    res.locals._csrfToken = req.csrfToken();
    next();
});

// database configuration
var mongoose = require('mongoose');
var options = {
    server: {
       socketOptions: { keepAlive: 1 } 
    }
};
switch(app.get('env')){
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, options);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, options);
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}

//middleware to show different workers handling different requests
app.use(function(req,res,next){
  var cluster = require('cluster');
  if(cluster.isWorker) console.log('Worker %d received request',
    cluster.worker.id);
    next();
});


// initialize vacations
/*Vacation.find(function(err, vacations){
    if(vacations.length) return;

    new Vacation({
        name: 'Hood River Day Trip',
        slug: 'hood-river-day-trip',
        category: 'Day Trip',
        sku: 'HR199',
        description: 'Spend a day sailing on the Columbia and ' + 
            'enjoying craft beers in Hood River!',
        priceInCents: 9995,
        tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Oregon Coast Getaway',
        slug: 'oregon-coast-getaway',
        category: 'Weekend Getaway',
        sku: 'OC39',
        description: 'Enjoy the ocean air and quaint coastal towns!',
        priceInCents: 269995,
        tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
        inSeason: false,
        maximumGuests: 8,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Rock Climbing in Bend',
        slug: 'rock-climbing-in-bend',
        category: 'Adventure',
        sku: 'B99',
        description: 'Experience the thrill of rock climbing in the high desert.',
        priceInCents: 289995,
        tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing', 'hiking', 'skiing'],
        inSeason: true,
        requiresWaiver: true,
        maximumGuests: 4,
        available: false,
        packagesSold: 0,
        notes: 'The tour guide is currently recovering from a skiing accident.',
    }).save();
});*/

// initialize dealers
/*Dealer.find({}, function(err, dealers){
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
});*/

// dealer geocoding
/*function geocodeDealer(dealer){
  var addr = dealer.getAddress(' ');
  if(addr===dealer.geocodedAddress) return;   // already geocoded

  if(dealerCache.geocodeCount >= dealerCache.geocodeLimit){
    // has 24 hours passed since we last started geocoding?
    if(Date.now() > dealerCache.geocodeCount + 24 * 60 * 60 * 1000){
      dealerCache.geocodeBegin = Date.now();
      dealerCache.geocodeCount = 0;
    } else {
      // we can't geocode this now: we've
      // reached our usage limit
      return;
      }
  }

  var geocode = require('./lib/geocode.js');
  geocode(addr, function(err, coords){
    if(err) return console.log('Geocoding failure for ' + addr);
    dealer.lat = coords.lat;
    dealer.lng = coords.lng;
    dealer.save();
  });
}

// optimize performance of dealer display
function dealersToGoogleMaps(dealers){
  var js = 'function addMarkers(map){\n' +
    'var markers = [];\n' +
    'var Marker = google.maps.Marker;\n' +
    'var LatLng = google.maps.LatLng;\n';
  dealers.forEach(function(d){
    var name = d.name.replace(/'/, '\\\'').replace(/\\/, '\\\\');
    js += 'markers.push(new Marker({\n' +
      '\tposition: new LatLng(' +
      d.lat + ', ' + d.lng + '),\n' +
      '\tmap: map,\n' +
      '\ttitle: \'' + name.replace(/'/, '\\') + '\',\n' +
      '}));\n';
  });
  js += '}';
  return js;
}

// dealer cache
var dealerCache = {
  lastRefreshed: 0,
  refreshInterval: 60 * 60 * 1000,
  jsonUrl: '/dealers.json',
  geocodeLimit: 2000,
  geocodeCount: 0,
  geocodeBegin: 0,
};
dealerCache.jsonFile = __dirname +
    '/public' + dealerCache.jsonUrl;
dealerCache.refresh = function(cb){

  if(Date.now() > dealerCache.lastRefreshed + dealerCache.refreshInterval){
    // we need to refresh the cache
    Dealer.find({ active: true }, function(err, dealers){
      if(err) return console.log('Error fetching dealers: '+ err);

      // geocodeDealer will do nothing if coordinates are up-to-date
      dealers.forEach(geocodeDealer);

      // we now write all the dealers out to our cached JSON file
      fs.writeFileSync(dealerCache.jsonFile, JSON.stringify(dealers));

      fs.writeFileSync(__dirname + '/public/js/dealers-googleMapMarkers.js', dealersToGoogleMaps(dealers));

      // all done -- invoke callback
      cb();
    });
  }
};

function refreshDealerCacheForever(){
  dealerCache.refresh(function(){
    // call self after refresh interval
    setTimeout(refreshDealerCacheForever,
    dealerCache.refreshInterval);
  });
}
// create empty cache if it doesn't exist to prevent 404 errors
if(!fs.existsSync(dealerCache.jsonFile)) fs.writeFileSync(JSON.stringify([]));
// start refreshing cache
refreshDealerCacheForever();*/

//middleware to add the flash object to the context if there’s one in the session
app.use(function(req, res, next){
  // if there's a flash message, transfer
  // it to the context, then clear it
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

//middleware to detect test=1 in the querystring or // set 'showTests' context property if the querystring contains test=1
app.use(function(req, res, next){
  res.locals.showTests = app.get('env') !== 'production' &&
  req.query.test === '1';
  next();
});

//initialize weather cache
//weather.getWeatherData();

//middleware to inject data into the res.locals.partials object or // middleware to add weather data to context
app.use(function(req, res, next){
  if(!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weather = weather.getWeatherData();
    next();
});

// twitter integration
var topTweets = {
  count: 10,
  lastRefreshed: 0,
  refreshInterval: 15 * 60 * 1000,
  tweets: [],
};
function getTopTweets(cb){
  if(Date.now() < topTweets.lastRefreshed + topTweets.refreshInterval) {
    return setImmediate(function() {
      cb(topTweets.tweets);
    });
  }

  twitter.search('#travel', topTweets.count, function(result){
    var formattedTweets = [];
    var embedOpts = { omit_script: 1 };
    var promises = result.statuses.map(function(status){
      return Q.Promise(function(resolve){
        twitter.embed(status.id_str, embedOpts, function(embed){
          formattedTweets.push(embed.html);
          resolve();
        });
      });
    });
    Q.all(promises).then(function(){
      topTweets.lastRefreshed = Date.now();
      cb(topTweets.tweets = formattedTweets);
    });
  });
}
// mmiddleware to add top tweets to context
app.use(function(req, res, next) {
    getTopTweets(function(tweets) {
        res.locals.topTweets = tweets;
        next();
    });
});

// middleware to handle logo image easter eggs
var static = require('./lib/static.js').map;
app.use(function(req, res, next){
  var now = new Date();
  res.locals.logoImage = now.getMonth()==9 && now.getDate()==21 ?
  static('/img/logo_bud_clark.png') :
  static('/img/logo.png');
  next();
});

// middleware to provide cart data for header
app.use(function(req, res, next) {
  var cart = req.session.cart;
  res.locals.cartItems = cart && cart.items ? cart.items.length : 0;
  next();
});


// create "admin" subdomain...this should appear
// before all your other routes
var admin = express.Router();
app.use(require('vhost')('admin.*', admin));

// create admin routes; these can be defined anywhere
admin.get('/', function(req, res){
    res.render('admin/home');
});
admin.get('/users', function(req, res){
    res.render('admin/users');
});


// add routes
//require('./routes.js')(app);

var Attraction = require('./models/attraction.js');

//var rest = require('connect-rest');


var Rest = require('connect-rest');

// sets up connect and adds other middlewares to parse query, parameters, content and session
// use the ones you need
var connectApp = connect()
    .use( bodyParser.urlencoded( { extended: true } ) )
    .use( bodyParser.json() );

// initial configuration of connect-rest. all-of-them are optional.
// default context is /api, all services are off by default
var options = {
    context: '/api',
    logger:{ file: 'mochaTest.log', level: 'debug' },
    apiKeys: [ '849b7648-14b8-4154-9ef2-8d1dc4c2b7e9' ],
    domain: require('domain').create(),
};
var rest = Rest.create( options );

// adds connect-rest middleware to connect
connectApp.use( rest.processRequest() );

// API configuration
/*var apiOptions = {
    context: '/',
    domain: require('domain').create(),
};*/

/*var apiOptions = {
context: '/api',
domain: require('domain').create(),
};*/

// link API into pipeline
//app.use(rest.rester(apiOptions));

options.domain.on('error', function(err){
    console.log('API domain error.\n', err.stack);
    setTimeout(function(){
        console.log('Server shutting down after API domain error.');
        process.exit(1);
    }, 5000);
    server.close();
    var worker = require('cluster').worker;
    if(worker) worker.disconnect();
});

rest.get('/attractions', function(req, content, cb){
    Attraction.find({ approved: true }, function(err, attractions){
        if(err) return cb({ error: 'Internal error.' });
        cb(null, attractions.map(function(a){
            return {
                name: a.name,
                description: a.description,
                location: a.location,
            };
        }));
    });
});

rest.post('/attraction', function(req, content, cb){
    var a = new Attraction({
        name: req.body.name,
        description: req.body.description,
        location: { lat: req.body.lat, lng: req.body.lng },
        history: {
            event: 'created',
            email: req.body.email,
            date: new Date(),
        },
        approved: false,
    });
    a.save(function(err, a){
        if(err) return cb({ error: 'Unable to add attraction.' });
        cb(null, { id: a._id });
    }); 
});

rest.get('/attraction/:id', function(req, content, cb){
    Attraction.findById(req.params.id, function(err, a){
        if(err) return cb({ error: 'Unable to retrieve attraction.' });
        cb(null, { 
            name: a.name,
            description: a.description,
            location: a.location,
        });
    });
});



// authentication
var auth = require('./lib/auth.js')(app, {
    baseUrl: process.env.BASE_URL,
    providers: credentials.authProviders,
    successRedirect: '/accountTP',
    failureRedirect: '/unauthorized',
});
// auth.init() links in Passport middleware:
auth.init();

// now we can specify our auth routes:
auth.registerRoutes();

// authorization helpers
/*function customerOnly(req, res, next){
    if(req.user && req.user.role==='customer') return next();
    // we want customer-only pages to know they need to logon
    res.redirect(303, '/unauthorized');
}
function employeeOnly(req, res, next){
    if(req.user && req.user.role==='employee') return next();
    // we want employee-only authorization failures to be "hidden", to
    // prevent potential hackers from even knowhing that such a page exists
    next('route');
}
function allow(roles) {
    return function(req, res, next) {
        if(req.user && roles.split(',').indexOf(req.user.role)!==-1) return next();
        res.redirect(303, '/unauthorized');
    };
}*/

// add routes
require('./routes.js')(app);

app.get('/unauthorized', function(req, res) {
    res.status(403).render('unauthorized');
});

// customer routes
//account page after registration
app.get('/accountLoc', authorize.allow('customer,employee'), function(req, res){
    var customer = require('./models/customer.js');
    customer.findOne({ 'userid': req.session.passport.user }, 'firstName lastName', function (err, person) {
      if (err) return handleError(err);
      var personName = person.firstName + ' ' + person.lastName;
      res.render('account', { username: personName });
    });
    //res.render('account', { username: req.user.name });
});

//account page after third party authentication
app.get('/accountTP', authorize.allow('customer,employee'), function(req, res){
  res.render('account', { username: req.user.name });
});

/*app.get('/account', authorize.allow('customer,employee'), showName(req,), function(req, res){
    var personName = res.Name;
    res.render('account', { username: personName });
    //res.render('account', { username: req.user.name });
});*/

app.get('/account/order-history', authorize.customerOnly, function(req, res){
    res.render('account/order-history');
});
app.get('/account/email-prefs', authorize.customerOnly, function(req, res){
    res.render('account/email-prefs');
});

// employer routes
app.get('/sales', authorize.employeeOnly, function(req, res){
    res.render('sales');
});

app.get('/userid', authorize.allow('customer,employee'), function(req, res){
    var user = req.session.passport.user;
    var customer = require('./models/customer.js');
    customer.findOne({ 'userid': req.session.passport.user }, 'firstName lastName', function (err, person) {
      if (err) return handleError(err);
      console.log('%s surname is %s.', person.firstName, person.lastName); // Space Ghost is a talk show host.
    });
    res.json(user);
});

//function to add display name to dashboard
/*function showName(req, res, next){
  var customer = require('./models/customer.js');
  customer.findOne({ 'userid': req.session.passport.user }, 'firstName lastName', function (err, person) {
    if (err) return handleError(err);
    var personName = person.firstName + ' ' + person.lastName;
    console.log(Name);
    return Name
    
    });
}*/

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}


// add support for auto views
var autoViews = {};

app.use(function(req,res,next){
    var path = req.path.toLowerCase();  
    // check cache; if it's there, render the view
    if(autoViews[path]) return res.render(autoViews[path]);
    // if it's not in the cache, see if there's
    // a .handlebars file that matches
    if(fs.existsSync(__dirname + '/views' + path + '.handlebars')){
        autoViews[path] = path.replace(/^\//, '');
        return res.render(autoViews[path]);
    }
    // no view found; pass on to 404 handler
    next();
});

// custom 404 page
app.use(function(req, res){
	res.status(404);
	res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

/*app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
	app.get('port') + '; press Ctrl-C to terminate.' );
});*/

var server;

/*function startServer() {
    server = http.createServer(app).listen(app.get('port'), function(){
      console.log( 'Express started in ' + app.get('env') +
        ' mode on http://localhost:' + app.get('port') +
        '; press Ctrl-C to terminate.' );
    });
}*/

function startServer() {
    var keyFile = __dirname + '/ssl/meadowlark.pem',
        certFile = __dirname + '/ssl/meadowlark.crt';
    if(!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
        console.error('\n\nERROR: One or both of the SSL cert or key are missing:\n' +
            '\t' + keyFile + '\n' +
            '\t' + certFile + '\n' +
            'You can generate these files using openssl; please refer to the book for instructions.\n');
        process.exit(1);
    }
    var options = {
        key: fs.readFileSync(__dirname + '/ssl/meadowlark.pem'),
        cert: fs.readFileSync(__dirname + '/ssl/meadowlark.crt'),
    };
    server = https.createServer(options, app).listen(app.get('port'), function(){
      console.log( 'Express started in ' + app.get('env') +
        ' mode on port ' + app.get('port') + ' using HTTPS' +
        '; press Ctrl-C to terminate.' );
    });
}

if(require.main === module){
    // application run directly; start app server
    startServer();
} else {
    // application imported as a module via "require": export function to create server
    module.exports = startServer;
}
