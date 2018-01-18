var restify = require('restify');
var builder = require('botbuilder');
var Conversation = require('watson-developer-cloud/conversation/v1');
let connect = require('./mongoDb');
let nodo=require('./nodos');

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

console.log('-------nodo: ',JSON.stringify(conversationContext.watsonContext));

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

            session.send(`Si aceptas este nuevo acuerdo del banco, pagarías un valor de $${result.valor_cuota} por ${result.nro_cuotas} cuotas.
            \n\n¿Estas de acuerdo.?`);
            response.context.nombreUsuario=infoUsuario.nombres;
            console.log(JSON.stringify(response.context));
            conversationContext.watsonContext=response.context;    
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






