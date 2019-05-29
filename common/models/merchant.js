'use strict';

module.exports = function(Merchant) {


  /**
   * push method for synchronization
   * @param {object} data description_argument
   * @param {Function(Error)} callback
   */

  Merchant.push = function(data, callback) {


    // TODO
    let toUpdate = [];
    let toInsert = [];
    let clientToUpdate = [];
    let clientToInsert = [];
    let i=0;
  // On récupère la date de dernière synchro du client
      let lastSync = new Date((data.lastSync));
      try{
        if (isNaN(lastSync)) throw BreakException;
      } catch (e) {
        callback("first object must be a valid date");
        return;
      }

      console.log("On récupère la date");
      console.log(typeof lastSync+lastSync);
    console.log("Conversion en string");
    console.log(typeof data.lastSync+data.lastSync);

      //Requête qui va chercher les éléments apparus sur le serveur après la date de synchronisation
        Merchant.find({where:{and:[{creationDate : {gt: data.lastSync}},{deleted:false}]}},function (err, value){
          if (err){
            callback(err);
            return;
          }
          clientToInsert = value;
          i++;
          console.log("Objets à créer sur le client\n"+JSON.stringify(clientToInsert));

          if (data.localChanges.length===0){
            console.log("Il n'y a rien à updater, on renvoie les nouvelles entrées");
            //Il n'y a rien à updater, on renvoie les nouvelles entrées
            callback(null,clientToUpdate,clientToInsert,new Date().toISOString());
            return;
          }

          data.localChanges.forEach((element,index)=>{


            Merchant.findById(element.id, function (err, merchant) {
              console.log("-------------------");
              if (err) {
                console.log(err);
              }
              if (merchant) {
                if (element.lastUpdated > merchant.lastUpdated.toISOString()) {
                  //Update
                  console.log("on fait l'update\n" + element.firstName);
                  toUpdate.push(element);
                } else if(element.lastUpdated < merchant.lastUpdated.toISOString()){
                  //Recupérer l'objet dans une liste
                  console.log("on garde\n" + merchant.firstName);
                  clientToUpdate.push(element);
                }
              } else {
                //Faire un insert
                console.log("on crée\n" + element.firstName);
                toInsert.push(element);
              }
              i++;
              //Lorsque toutes les actions sont terminées
              if (i===data.localChanges.length+1){
                //On fait un Bulk Insert
                if (toInsert.length>0){
                  Merchant.create(toInsert, function(error, response){
                    if(error) console.log(error);
                    else console.log("réponse du create:\n"+response);
                  });
                }
                if (toUpdate.length>0){
                  //On fait une boucle pour faire un upsert (remplace l'update)
                  toUpdate.forEach((itemToUpdate)=>{
                    console.log("on rentre dans la boucle du update");
                    i=0;
                    Merchant.upsert(itemToUpdate, function(error, response){
                      if(error) console.log(error);
                      else console.log("réponse du update:\n"+response);
                      i++;
                      if(i===toUpdate.length){
                        console.log("upsert terminé");
                      }
                    });
                  });
                }

                console.log("-----TO UPDATE--------\n"+JSON.stringify(toUpdate)+"\n---TO INSERT---\n"+JSON.stringify(toInsert)+"\n---TO PULL---\n"+JSON.stringify(clientToUpdate));
                callback(null,clientToUpdate,clientToInsert,new Date().toISOString());
              }
            });
          });




        });




    /* Tentative de faire une recherche dans un array
  let idList = [];
  //On récupère les objets présent dans la liste
    data.localChanges.forEach((merchant)=>{
      idList.push(merchant.id);
    });
    let serverMerchantList = [];
    let promise1 = new Promise (function (resolve,reject){
      console.log("idList:\n"+idList);
      Merchant.find({where:{id:{inq:["[\"cabc3a40-76f1-11e9-8f65-453b218fe36f\"]"]}}},function (response) {
        console.log("recherche lancée : " +response);
        resolve(response);
      });
    });

    promise1.then((value)=>{
      console.log("réponse de la recherche:\n"+value);
    });
*/


  };
};


