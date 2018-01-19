var restify = require('restify');
var builder = require('botbuilder');
var Conversation = require('watson-developer-cloud/conversation/v1');
let connect = require('./mongoDb');
let nodo=require('./nodos');
var email=require('./sendEmail');


require('dotenv').config({silent: true});


var contexts;
var workspace=process.env.WORKSPACE_ID || '';


// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
console.log('%s listening to %s', server.name, server.url);
});


// Create the service wrapper
var conversation = new Conversation({
    // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
    // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
    // username: '<username>',
    // password: '<password>',
    url: 'https://gateway.watsonplatform.net/conversation/api',
    version_date: Conversation.VERSION_DATE_2017_04_21
  });



// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
appId: process.env.MICROSOFT_APP_ID,
appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());



function findOrCreateContext (convId){
    // Let's see if we already have a session for the user convId
  if (!contexts)
      contexts = [];

  if (!contexts[convId]) {
      // No session found for user convId, let's create a new one
      //with Michelin concervsation workspace by default
      contexts[convId] = {workspaceId: workspace, watsonContext: {}};
      //console.log ("new session : " + convId);
  }
return contexts[convId];
}


// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
//session.send('You said: %s', session.message.text);

var payload = {
    workspace_id: workspace,
    context:'',
    input: { text: session.message.text}
};

var conversationContext = findOrCreateContext(session.message.address.conversation.id);
if (!conversationContext) conversationContext = {};
payload.context = conversationContext.watsonContext;


conversation.message(payload, function(err, response) {

  if (err) {
    session.send(err);
  } else {
    session.send(response.output.text);
    conversationContext.watsonContext = response.context;

    if (response.output.action === "buscarCedula") {
        let documento={cedula:response.context.nroCedula};
        connect.buscarxCedula(documento,result=>{
                session.userData.datosUsuario=result;

                if(result.length===0){
                    session.send("El número de documento que me indicó no aparece en el sistema, verifica e ingresa de nuevo.");
                    conversationContext.watsonContext=nodo.nodo_credito;
                }else{
                    //session.send(`Correcto Sr(a) ${session.userData.datosUsuario.nombres}. \n\nEstas son las opciones disponibles de tu crédito.\n\n-Consultar saldo.\n\n-Solicitar Renegociación.\n\n¿Que opción deseas.?`);
                    //conversationContext.watsonContext=nodo.nodo_saldo;
                    let opcion1='\n\n-Solicitar saldo.';
                    let opcion2='\n\n-Solicitar renegociación.';
                    session.send(`Correcto sr(a) ${session.userData.datosUsuario.nombres}, estas son las opciones disponibles para tu crédito:%s%s\n\n¿Cuál deseas?.`,opcion1,opcion2);
                    conversationContext.watsonContext=response.context;

                }

        });
    }else if(response.output.action==="solicitarSaldo"){
        let infoUsuario=session.userData.datosUsuario;
        let documento={cliente_id:infoUsuario.cedula};
            connect.buscarCreditoxCedula(documento,result=>{
            session.send(`Sr(a) %s La información para el número de credito %s es:
            \n\nTipo de crédito: %s
            \n\nCupo inicial: $%s
            \n\nSaldo pendiente: $%s
            \n\nNúmero de cuotas: %s
            \n\nValor de la cuota: $%s
            \n\nCrédito en mora: %s
            \n\n Esta información será enviada a su correo electrónico.
            \n\n¿Desea ver la opciones de renegociación?`,
            infoUsuario.nombres,result.nro_cuenta,result.tipo_credito,result.cupo_total,result.valor_deuda,result.nro_cuotas,result.valor_cuota,(result.mora)=='y'?'Si':'No');
        }
        );

    }else if(response.output.action==="solicitarRenegociacion"){
        let infoUsuario=session.userData.datosUsuario;
        let documento={cliente_id:infoUsuario.cedula};
        connect.buscarCreditoxCedula(documento,result=>{
            session.send(`Sr(a) %s La información para el número de credito %s es:
            \n\nTipo de crédito: %s
            \n\nCupo inicial: $%s
            \n\nSaldo pendiente: $%s
            \n\nNúmero de cuotas: %s
            \n\nValor de la cuota: $%s
            \n\nCrédito en mora: %s`,
            infoUsuario.nombres,result.nro_cuenta,result.tipo_credito,result.cupo_total,result.valor_deuda,result.nro_cuotas,result.valor_cuota,(result.mora)=='y'?'Si':'No');
            session.send(`¿Que opción deseas para renegociar?
            \n\n-Ver acuerdos propuestos por el banco.
            \n\n-Indicar una capacidad de pago.
            \n\n-Indicar un número de cuotas.`);
            session.userData.datosCreditoUsario=result;
        });


    }else if(response.output.action==="acuerdoBanco"){
        let infoUsuario=session.userData.datosUsuario;
        let documento={cliente_id:infoUsuario.cedula};
        connect.buscarCreditoxCedula(documento,result=>{
            /*result.nro_cuenta
            result.tipo_credito
            result.cupo_total
            result.valor_deuda
            result.nro_cuotas
            result.valor_cuota*/

            if(result.nro_cuotas<=36){
                result.nro_cuotas=48;
                result.valor_cuota=Math.round(result.valor_deuda/result.nro_cuotas);
            }

            session.send(`El banco ofrece como alternativa pagar un valor de $${result.valor_cuota} por ${result.nro_cuotas} cuotas.
            \n\n¿Estas de acuerdo?`);
            session.userData.nuevoNroCuotas=result.nro_cuotas;
            session.userData.nuevoValorCuota=result.valor_cuota;
            response.context.nombreUsuario=infoUsuario.nombres;
            conversationContext.watsonContext=response.context;
        });


    }else if(response.output.action==="acuerdoCapacidadPago"){
        let capacidadPago=response.context.capacidadPago;
        let infoUsuario=session.userData.datosUsuario;
        let documento={cliente_id:infoUsuario.cedula};
        connect.buscarCreditoxCedula(documento,result=>{

            if(capacidadPago!=null){
                result.valor_cuota=capacidadPago;
                result.nro_cuotas=Math.round(result.valor_deuda/result.valor_cuota);

            }

            session.send(`Según su capacidad de pago pagaría un valor $${result.valor_cuota} por ${result.nro_cuotas} cuotas.
            \n\n¿Estas de acuerdo?`);
            session.userData.nuevoNroCuotas=result.nro_cuotas;
            session.userData.nuevoValorCuota=result.valor_cuota;
            response.context.nombreUsuario=infoUsuario.nombres;
            conversationContext.watsonContext=response.context;
        });



    }else if(response.output.action==="opcionesAcuerdo"){
        let infoUsuario=session.userData.datosUsuario;
        let documento={cliente_id:infoUsuario.cedula};
        connect.buscarCreditoxCedula(documento,result=>{
            session.send(`¿Que opción deseas para renegociar?
            \n\n-Ver acuerdo propuesto por el banco.
            \n\n-Por capacidad de pago.
            \n\n-Por número de cuotas.`);
        });

    }else if(response.output.action==="correoAcuerdoBanco"){
           let contenido=`Sr(a) ${session.userData.datosUsuario.nombres}.
           \nReciba un coordial saludo,
           \nPara mí fue un placer haber atendido su requerimiento, referente al número de crédito ${session.userData.datosCreditoUsario.nro_cuenta}.\nSegún la conversación previa se llegó a un nuevo acuerdo de pago con las siguientes condiciones:
           \nValor de la cuota: $${session.userData.nuevoValorCuota}.\nNúmero de cuotas: ${session.userData.nuevoNroCuotas}.\n\nEsta información será previamente analizada por uno de nuestros asesores que se contactará con usted para oficializar el nuevo acuerdo.
           \n\nAtentamente,
           \nBANWERC\nAsesor virtual.
           `;
           let correo= session.userData.datosUsuario.email;

           let asunto=`Solicitud acuerdo de pago`;


           email.enviarEmail(correo,asunto,contenido);


    }
    //Envio de correo al terminar la consulta del saldo
    else if(response.output.action=="correoInfoSaldo"){

           let documento = {cliente_id:session.userData.datosUsuario.cedula}

           connect.buscarCreditoxCedula(documento,result=>{
             session.userData.datosCreditoUsario=result;

             let contenido = `Sr(a) ${session.userData.datosUsuario.nombres}.
             \nReciba un cordial saludo,
             \nSegún la consulta realizada en nuestro portal referente al número de crédito ${session.userData.datosCreditoUsario.nro_cuenta},\nrelaciono detalles de tu saldo actual y el estado del crédito :
             \nTipo de crédito : ${session.userData.datosCreditoUsario.tipo_credito}.\nCupo inicial : $${session.userData.datosCreditoUsario.cupo_total}.\nSaldo pendiente : $${session.userData.datosCreditoUsario.valor_deuda}.\nNúmero de cuotas : ${session.userData.datosCreditoUsario.nro_cuotas}.\nValor de la cuota : $${session.userData.datosCreditoUsario.valor_cuota}.\nTasa Efectiva anual : ${session.userData.datosCreditoUsario.tasa}\nCrédito en mora : ${(session.userData.datosCreditoUsario.mora=='y')?'Si':'No'}.
             \nRecuerda que puedes consultar tu información en cualquier momento y visitar las opciones que tenemos disponibles para ti.
             \n\nAtentamente,
             \nBANWER\nAsesor virtual.
             `;

             let correo= session.userData.datosUsuario.email;
             let asunto = "Información de saldo y estado de la cuenta";

             email.enviarEmail(correo,asunto,contenido);



           });
        }



    else {

        // Mostrar la salida del diálogo, si la hay.
        if (response.output.text.length != 0) {
            console.log(response.output.text[0]);
        }

    }


  }
 });

});






