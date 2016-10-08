var Browser = require('zombie'),
assert = require('chai').assert;

var browser;

suite('Cross-Page Tests', function(){
	setup(function(){
		browser = new Browser();
	});

	test('requesting a group rate quote from the hood river tour page' + ' should populate the referrer field', function(done){
		console.log("test invoked");
		//this.timeout(5000);
		var referrer = 'http://localhost:3000/tours/hood-river';
		browser.visit(referrer, function(){
			console.log("page visited");
			browser.clicklink('.requestGroupRate', function(){
				console.log("page visited");
				assert(browser.field('referrer').value === referrer);
				done();
				});
			});
		});

	test('requesting a group rate from the oregon coast tour page should ' + ' populate the referrer field', function(done){
		console.log("test invoked");
		//this.timeout(5000);
		var referrer = 'http://localhost:3000/tours/oregon-coast';
		browser.visit(referrer, function(){
			console.log("page visited");
			browser.clicklink('.requestGroupRate', function(){
				console.log("link clicked");
				assert(browser.field('referrer').value === referrer);
				done();
				});
			});
		});

	test('visiting the "request group rate" page dirctly should result ' + ' in an empty referrer field', function(done){
		//this.timeout(15000);
		browser.visit('http://localhost:3000/tours/request-group-rate', function(){
			assert(browser.field('referrer').value === '');
			done();
			});
		});
});