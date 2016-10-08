var Q = require('q'),
    http = require('http'),
    credentials = require('../credentials.js');

exports.getWeatherData = (function (){
	// mocked weather data
	//var getWeatherData = (function(){
    // our weather cache
    var c = {
      refreshed: 0,
      refreshing: false,
      updateFrequency: 360000, // 1 hour
      locations: [
        { name: 'Portland' },
        { name: 'Bend' },
        { name: 'Manzanita' },
      ]
    };
    return function() {
      //console.log("CALLED")
      if( !c.refreshing && Date.now() > c.refreshed + c.updateFrequency ){
        c.refreshing = true;
        var promises = c.locations.map(function(loc){
          return Q.Promise(function(resolve){
            console.log("CALLED")
            var url = 'http://api.wunderground.com/api/' +
              credentials.WeatherUnderground.ApiKey +
              '/conditions/q/OR/' + loc.name + '.json';
            http.get(url, function(res){
              var body = '';
              res.on('data', function(chunk){
                body += chunk;
              });
              res.on('end', function(){
                body = JSON.parse(body);
                loc.forecastUrl = body.current_observation.forecast_url;
                loc.iconUrl = body.current_observation.icon_url;
               	loc.weather = body.current_observation.weather;
                loc.temp = body.current_observation.temperature_string;
                resolve();
              });
            });
          });
        });
        Q.all(promises).then(function(){
          c.refreshing = false;
          c.refreshed = Date.now();
        });
      }
      return { locations: c.locations };
    };
	//})();
// initialize weather cache
//getWeatherData();
})();

/*exports.getWeatherData = function (){
		return {
			locations: [
				{
					name: 'Portland',
					forecastUrl: 'https://www.wunderground.com/US/OR/Portland.html',
					iconUrl: 'https://icons-ak.wxug.com/i/c/k/cloudy.gif',
					weather: 'Overcast',
					temp: '54.1 F (12.3 C)',
				},
				{
					name: 'Bend',
					forecastUrl: 'https://www.wunderground.com/US/OR/Bend.html',
					iconUrl: 'https://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
					weather: 'Partly Cloudy',
					temp: '55.0 F (12.8 C)',
				},
				{
					name: 'Manzanita',
					forecastUrl: 'https://www.wunderground.com/US/OR/Manzanita.html',
					iconUrl: 'https://icons-ak.wxug.com/i/c/k/rain.gif',
					weather: 'Light Rain',
					temp: '55.0 F (12.8 C)',
				},
			],
		};
	}*/