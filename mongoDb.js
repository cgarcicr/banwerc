const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

//Connection MongoDB (mLabs)

const url ='mongodb://system:system@ds023303.mlab.com:23303/bot_demo';


/*const conDb=(db)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Conectado a la BD");
    db.close();
  });

}*/

/*MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  db.collection("usuarios").find({}).toArray(function(err, result) {
    if (err) throw err;
    console.log(result);
    db.close();
  });
});*/

module.exports={
    //conDb:conDb,
    findAll:function(){

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection("usuarios").find({}).toArray(function(err, result) {
          if (err) throw err;
          console.log(result);
          db.close();
        });
      });     
  },

  buscarxCedula:function(documento,cb){
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;      
      db.collection("usuarios").find(documento).toArray(function(err, result) {
        if (err) throw err;
        if(result.length===0){
           cb(result);
        }else{
               cb(result[0]);     
          }
        db.close();
      });
    });

  },

  buscarCreditoxCedula:function(documento,cb){
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;      
      db.collection("creditos").find(documento).toArray(function(err, result) {
        if (err) throw err;
        if(result.length===0){
           cb(result);
        }else{
               cb(result[0]);     
          }
        db.close();
      });
    });

  }






}

