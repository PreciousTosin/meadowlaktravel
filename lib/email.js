var nodemailer = require('nodemailer');

module.exports = function(credentials){

	/*var mailTransport = nodemailer.createTransport('SMTP',{
		service: 'Gmail',
		auth: {
			user: credentials.gmail.user,
			pass: credentials.gmail.password,
		}*/

	var smtpConfig = {
		host: 'smtp.gmail.com',
	  port: 465,
	  secure: true, // use SSL
		auth: {
			user: credentials.gmail.user,
			pass: credentials.gmail.password,
		}
	}

	// create reusable transporter object using the default SMTP transport
	var mailTransport = nodemailer.createTransport(smtpConfig);
		

	var from = '"Meadowlark Travel" <info@meadowlarktravel.com>';
	var errorRecipient = 'infinitoholdings@gmail.com';

	return {
		send: function(to, subj, body){
		    mailTransport.sendMail({ 	// send mail with defined transport object
		        from: from,
		        to: to,
		        subject: subj,
		        html: body,
		        generateTextFromHtml: true
		    }, function(err){
		        if(err) console.error('Unable to send email: ' + err);
		    });
		},

		emailError: function(message, filename, exception){
			var body = '<h1>Meadowlark Travel Site Error</h1>' +
				'message:<br><pre>' + message + '</pre><br>';
			if(exception) body += 'exception:<br><pre>' + exception + '</pre><br>';
			if(filename) body += 'filename:<br><pre>' + filename + '</pre><br>';
		    mailTransport.sendMail({
		        from: from,
		        to: errorRecipient,
		        subject: 'Meadowlark Travel Site Error',
		        html: body,
		        generateTextFromHtml: true
		    }, function(err){
		        if(err) console.error('Unable to send email: ' + err);
		    });
		},
	};
};
