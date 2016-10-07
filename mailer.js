var util = require('util');
var clear = require('clear');
var async = require('async'); 
var bittrex = require('bittrex-api');
var MailListener = require("mail-listener2");

var czyDoszloPolecenie = false;

var client = new bittrex('my_public_key', 'my_private_key');

function sprawdzBalansIUruchomJesliJest(){
	client.getbalances(function (err, response, taskcallback) {
	    if (err) {
	    	sprawdzBalansIUruchomJesliJest();
	        console.log(JSON.stringify(err));
	    } else {
	        taskcallback(err, response);
	    }
	    function taskcallback(error, response) {
	       if (error) {
	          console.log(JSON.stringify(error) + ' ' + JSON.stringify(response));
	          sprawdzBalansIUruchomJesliJest();
	       } else {
	          console.log(JSON.stringify(response.success));
	          if(response.success==false){
	          	sprawdzBalansIUruchomJesliJest();
	          }else{
	          	start();
	          }
	          
	       }
	    }
	});
}


sprawdzBalansIUruchomJesliJest();

 

function sprawdzCzyJakiesPolecenie(){
	console.log(czyDoszloPolecenie);
}

function start(){
	setInterval(sprawdzCzyJakiesPolecenie, 100);
}

 
var mailListener = new MailListener({
  username: "",
  password: "",
  host: "imap.gmail.com",
  port: 993, // imap port 
  tls: true,
  fetchUnreadOnStart: true //,
});
 
mailListener.on("server:connected", function(){
  console.log("imapConnected");
});

mailListener.on("server:disconnected", function(){
  console.log("imapDisconnected");
});

// this is where it starts to differ from the first sample

// A more complex example.
// Get the first 20 (UNSEEN) emails, mark them read (\SEEN), 
// and archive them.
(function () {
  // make sure you include in options:  
  //   fetchUnreadOnStart: true,
  var count = 0;

  mailListener.on("mail", function(mail, seqno, attributes) {
    var mailuid = attributes.uid,
      toMailbox = '[Gmail]/All Mail',
      i = ++count;

    if (i > 20) {
      mailListener.stop(); // start listening
      return;
    }

    console.log('email parsed', { 
      i: i, 
      subject: mail.subject, 
      seqno: seqno, 
      uid: attributes.uid,
      attributes: attributes 
    });

    console.log('attempting to mark msg read/seen');
    mailListener.imap.addFlags(mailuid, '\\Seen', function (err) {
      if (err) {
        console.log('error marking message read/SEEN');
        return;
      }

      console.log('moving ' + (seqno || '?') + ' to ' + toMailbox);
        mailListener.imap.move(mailuid, toMailbox, function (err) {
          if (err) {
            console.log('error moving message');
            return;
          }
          console.log('moved ' + (seqno || '?'), mail.subject);
        });
    });
  });
})();


mailListener.start(); // start listening

// When testing this script with GMail in US it took about 
// 8 seconds to get unread email list, another 40 seconds 
// to archive those 20 messages (move to All Mail).
setTimeout(function () {
  mailListener.stop(); // start listening
}, 60*1000);