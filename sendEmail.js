var nodemailer = require('nodemailer');
// email sender function

module.exports.enviarEmail=(para,asunto,contenido)=>{
// Definimos el transporter

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'innovacionSophos@gmail.com',
            pass: 'innovacionSophos2017'
        }
    });
// Definimos el email
var mailOptions = {
    from: 'innovacionSophos@gmail.com',
    to: para,
    subject: asunto,
    text: contenido
};
// Enviamos el email
transporter.sendMail(mailOptions, function(error, info){
    if (error){
        console.log("Se presentó un error: ",error);
       
    } else {
        console.log("Correo Enviado Exitosamente");
        
    }
});
};