'use strict';

module.exports = function(Merchant) {


  /**
   * push method for synchronization
   * @param {object} data description_argument
   * @param {Function(Error)} callback
   */

  Merchant.push = async function (data, callback) {


    // TODO
    let toUpdate = [];
    let toInsert = [];
    let clientToUpdate = [];
    let clientToInsert = [];
    let picToUpload = [];
    let picToDownload = [];
    let i = 0;
    // On récupère la date de dernière synchro du client
    let lastSync = new Date((data.lastSync));
    try {
      if (isNaN(lastSync)) throw BreakException;
    } catch (e) {
      callback("first object must be a valid date");
      return;
    }

    console.log("On récupère la date");
    console.log(typeof lastSync + lastSync);
    console.log("Conversion en string");
    console.log(typeof data.lastSync + data.lastSync);

    //Requête qui va chercher les éléments apparus sur le serveur après la date de synchronisation
    let newMerchants = await Merchant.find({where: {and: [{creationDate: {gt: data.lastSync}}, {deleted: false}]}});
    clientToInsert = newMerchants;
    newMerchants.forEach((element) => {
      if (element.pictureFileName != null)
        picToDownload.push(element.id);
    });
    console.log("Nouveaux marchands à insert sur le client\n" + JSON.stringify(clientToInsert));
  //Requête qui va chercher les éléments modifiés sur le serveur après la date de synchronisation
    let modifiedMerchants = await Merchant.find({where:{lastUpdated : {gt: data.lastSync}}});
    if (modifiedMerchants.size>0){
      modifiedMerchants.forEach((elementServer)=> {
        console.log("caca");
        data.localChanges.forEach((elementClient)=> {
          console.log("coucou");
          if (elementClient.id !== elementServer.id) {
            clientToUpdate.push(elementServer);
          }
        });
      });
    }
    else{
      clientToUpdate=modifiedMerchants;
    }

  //Pour chaque donnée créée ou modifiée par le client, on regarde ce qu'il convient d'en faire
    for (const element of data.localChanges) {
      let serverMerchant = await Merchant.findById(element.id);
      //On cherche si un marchand existe pour cet id
      if (serverMerchant) {
        //Si l'élément envoyé par le client est plus récent, on l'update sur le serveur
        if (element.lastUpdated > serverMerchant.lastUpdated.toISOString()) {
          console.log("on fait l'update\n" + element.firstName);
          toUpdate.push(element);
          if (element.pictureFileName != null && serverMerchant.pictureFileName !== element.pictureFileName)
            picToUpload.push(element.id);
        }
        //Si l'élément envoyé par le client est moins récent, le client va le recuperer du serveur
        else if(element.lastUpdated < serverMerchant.lastUpdated.toISOString()){
          //Recupérer l'objet dans une liste
          console.log("on garde\n" + serverMerchant.firstName);
          clientToUpdate.push(element);
          if (serverMerchant.pictureFileName!=null && serverMerchant.pictureFileName !== element.pictureFileName)
            picToDownload.push(serverMerchant.id);
        }
      }
      //Le marchand n'existe pas, on le crée
      else {
        //Faire un insert
        console.log("on crée\n" + element.firstName);
        toInsert.push(element);
        if (element.pictureFileName!=null)
          picToUpload.push(element.id);
      }
    }
    console.log("Marchands à update sur le client\n" + JSON.stringify(clientToUpdate));
    console.log("-----TO UPDATE--------\n"+JSON.stringify(toUpdate)+"\n---TO INSERT---\n"+JSON.stringify(toInsert)+"\n---TO PULL---\n"+JSON.stringify(clientToUpdate)
      +"\n---PICTURES TO UPLOAD---\n"+JSON.stringify(picToUpload)+"\n---PICTURES TO DOWNLOAD---\n"+JSON.stringify(picToDownload));
    //On effectue les opérations sur la BDD duserveur

    //On fait un Bulk Insert
    if (toInsert.length>0){
      await Merchant.create(toInsert);
    }
    if (toUpdate.length>0){
      //On fait une boucle pour faire un upsert (remplace l'update)
      for (let itemToUpdate of toUpdate){
        await Merchant.upsert(itemToUpdate, function cb(err, obj){

        });
      }
      console.log("upsert terminé");
    }
    callback(null,clientToUpdate,clientToInsert,picToUpload,picToDownload,new Date().toISOString());
  }
};



