var util = require('util');
var clear = require('util');
var async = require('async'); 
var bittrex = require('bittrex-api');
var Imap = require('imap');
var inspect = require('util').inspect;
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var prefixSchema = new Schema({
  prfix: { type: String, required: true },
  date: { type: Date, required: true }
});
var Prefix = mongoose.model('Prefix', prefixSchema);

var czyDoszloPolecenie = false;
var selllimit = -1;
var buylimit = -1;
var sellmarket = -1;
var buymarket = -1;

var client = new bittrex('public key', 'private key');

var imap = new Imap({
  user: 'bittrexmail@gmail.com',
  password: 'bittrex123',
  host: 'imap.gmail.com',
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

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
              console.log(response);
	          	imap.connect();
              imap.once('ready', function() {
                chekcMsg();
              });
	          }
	       }
	    }
	});
}

var typeToSend, market, quantity, rate;

function chekcMsg(){
  
  typeToSend ='';
  market='';
  quantity='';
  rate='';

      openInbox(function(err, box) {

        if (err) throw err;
        var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM)','TEXT'] });
        f.on('message', function(msg, seqno) {
          var czyIndeksJuzIstnieje = false;
          //console.log('Message #%d', seqno);
          var prefix = '(#' + seqno + ') ';
          msg.on('body', function(stream, info) {
            if (info.which === 'TEXT')
              //console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
              var buffer = '', count = 0;
              stream.on('data', function(chunk) {
              count += chunk.length;
              buffer += chunk.toString('utf8');
              if (info.which === 'TEXT'){
                //console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
              }
            });
            stream.once('end', function() {
              if (info.which !== 'TEXT'){
                //console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
              }else{

                Prefix.find({prfix: seqno}, function(err, prfx) {
                  if (err)  throw err;
                  // object of the user
                  if(prfx[0]!=undefined){
                    console.log('BYL',seqno, prfx[0].prfix);
                  }
                  if(prfx[0]==undefined){
                    console.log('NIE BYLO JESZCZE');
                    var newPrefix = Prefix({
                      prfix: seqno,
                      date: new Date()
                    });
                    newPrefix.save(function(err) {
                      if (err) throw err;
                      console.log('newprefix in db!', newPrefix.prfix);
                    });
                    selllimit = buffer.search("selllimit");
                    buylimit = buffer.search("buylimit");
                    sellmarket = buffer.search("sellmarket");
                    buymarket = buffer.search("buymarket");
                    var indexInStringOfType = selllimit>buylimit?selllimit:(buylimit>sellmarket?buylimit:(sellmarket>buymarket?sellmarket:buymarket));
                    var firstSpaceIndex = indexInStringOfType + buffer.substring(indexInStringOfType).indexOf(' ');
                    var secondSpaceIndex = firstSpaceIndex + buffer.substring(firstSpaceIndex+1).indexOf(' ');
                    var thirdSpaceIndex = secondSpaceIndex + buffer.substring(secondSpaceIndex+2).indexOf(' ');
                    var endIndex = thirdSpaceIndex + buffer.substring(secondSpaceIndex+3).indexOf(' ');
                    typeToSend = selllimit>buylimit?'selllimit':(buylimit>sellmarket?'buylimit':(sellmarket>buymarket?'sellmarket':'buymarket'));
                    //console.log(prefix, indexInStringOfType, typeToSend, selllimit, buylimit, sellmarket, buymarket);
                    //console.log(indexInStringOfType, firstSpaceIndex, secondSpaceIndex, thirdSpaceIndex, endIndex);
                    //str.substring(0, str.indexOf(" ", 10));
                    //console.log(buffer.substring(indexInStringOfType,firstSpaceIndex));
                    //console.log(buffer.substring(firstSpaceIndex+1,secondSpaceIndex+1));
                    //console.log(buffer.substring(secondSpaceIndex+2,thirdSpaceIndex+2));
                    //console.log(buffer.substring(thirdSpaceIndex+3,endIndex+4));
                    //console.log(prefix + 'Body [%s] Finished', inspect(info.which));
                    selllimit = -1;
                    buylimit = -1;
                    sellmarket = -1;
                    buymarket = -1;

                    market=buffer.substring(firstSpaceIndex+1,secondSpaceIndex+1);
                    quantity=buffer.substring(secondSpaceIndex+2,thirdSpaceIndex+2);
                    rate=buffer.substring(thirdSpaceIndex+3,endIndex+4);

                    console.log('NOWE POLECENIE', typeToSend, market, quantity, rate);

                    switch(typeToSend){
                      case 'buylimit':
                      console.log(typeToSend, market, quantity, rate);
                        client.buylimit(market, quantity, rate, function (error, response) {
                          console.log(JSON.stringify(response));
                        });
                      break;
                      case 'buymarket':
                      console.log(typeToSend, market, quantity);
                        client.buymarket(market, quantity, function (error, response) {
                          console.log(JSON.stringify(response));
                        });
                      break;
                      case 'selllimit':
                      console.log(typeToSend, market, quantity, rate);
                        client.selllimit(market, quantity, rate, function (error, response) {
                          console.log(JSON.stringify(response));
                        });
                      break;
                      case 'sellmarket':
                      console.log(typeToSend, market, quantity);
                        client.sellmarket(market, quantity, function (error, response) {
                          console.log(JSON.stringify(response));
                        });
                      break;
                    }
                  }
                });
/*
                Prefix.findOneAndUpdate({ prfix: (seqno-1) }, { prfix: seqno }, function(err, prfx) {
                  if (err) throw err;
                  console.log('db',seqno, prfx);
                });
*/
              }
            });
          });
          msg.once('attributes', function(attrs) {
            //console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
          });
          msg.once('end', function() {
            //console.log(prefix + 'Finished');
          });
        });
        f.once('error', function(err) {
          console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
          //console.log('Done fetching all messages!');
          
          chekcMsg();
          
          //wyslij zapytanie do api bittrexa, w odpowiedzi uruchom ponownie 
        });
      });
}

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

mongoose.connect('mongodb://localhost/lastmailprefix');

sprawdzBalansIUruchomJesliJest();