// authorization helpers
exports.customerOnly = function(req, res, next){
    if(req.user && req.user.role==='customer') return next();
    // we want customer-only pages to know they need to logon
    res.redirect(303, '/unauthorized');
}
exports.employeeOnly = function(req, res, next){
    if(req.user && req.user.role==='employee') return next();
    // we want employee-only authorization failures to be "hidden", to
    // prevent potential hackers from even knowhing that such a page exists
    next('route');
}
exports.allow = function(roles) {
    return function(req, res, next) {
        if(req.user && roles.split(',').indexOf(req.user.role)!==-1) return next();
        res.redirect(303, '/unauthorized');
    };
}

exports.findcustId = function(req, res, next){
        Customer.findOne({ 'userid': req.session.passport.user }, function(err, customer) {
            var custid = customer._id;
            console.log(customer._id);
            return custid;
        });
    }