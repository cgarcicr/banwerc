var key = 'key-88ece16b398a5257e77ad87cc31e6534';
var dom = 'sandbox5ec5f8c6c8164a83ba17c7d7c3c1b0c8.mailgun.org';

var Mailgun = require('mailgun-js')

module.exports.sendMessage = (para,asunto,texto)=>{

  var mailgun = new Mailgun({apiKey: key, domain: dom});

  var data = {
    from: 'innovacionSophos@gmail.com',
    to: para,
    subject: asunto,
    text: texto
  };


  mailgun.messages().send(data, function (err) {

    if (err) {
      console.log('Ocurrio un error : ', err);
    }

    else {console.log('Mensaje enviado');
    }

  })


}
