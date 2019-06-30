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
  };

  Merchant.avgincoming = async function (callback) {
    //Requête qui va récupérer les revenus >0
    const incomings = await Merchant.find({where: {and: [{incoming: {gt: 0}}, {deleted: false}]}, fields: {incoming: true}});
    let total = 0;
    incomings.forEach((incoming)=>{
      console.log(incoming.incoming);
      total+=incoming.incoming;
    });
    const avg = total / incomings.length;
    console.log(total);
    callback(null,avg);
  };

  Merchant.incomingsCharts = async function (callback) {
    const min = 0;
    const maxResult = await Merchant.find({where: {and: [{incoming: {gt: 0}}, {deleted: false}]},order: 'incoming DESC' , limit: 1 , fields: {incoming: true}});
    let categoriesNumber = 4;
    let max=maxResult[0].incoming;
    console.log ("revenueMax "+JSON.stringify(max));
    let stats=[];

    for (let i=0; i<categoriesNumber;i++){
      const minValue = (max-min)/categoriesNumber*i;
      const maxValue = (max-min)/categoriesNumber*(i+1);
      console.log("min "+minValue+"max "+maxValue);
      const merchants = await Merchant.find({where: {and: [{incoming: {gt: minValue}},{incoming: {lte: maxValue}}, {deleted: false}]}, fields: {incoming: true}});
      stats[i] = {
        range : maxValue,
        value: merchants.length
      };

    }


    //On récupère la valeur max
    callback(null,stats);

  },
  Merchant.createList = async function (callback) {

    await Merchant.destroyAll();
    
    const pictureList = [
      {
        "container": "photos",
        "name": "adult-seller-portrait-butcher-store-450w-501546550.jpg",
        "size": 47245,
        "atime": "2019-06-30T12:36:26.805Z",
        "mtime": "2019-06-30T12:24:14.589Z",
        "ctime": "2019-06-30T12:38:06.548Z"
      },
      {
        "container": "photos",
        "name": "beautiful-female-barista-looking-camera-450w-572276428.jpg",
        "size": 25393,
        "atime": "2019-06-30T12:36:26.850Z",
        "mtime": "2019-06-30T12:21:39.967Z",
        "ctime": "2019-06-30T12:38:56.284Z"
      },
      {
        "container": "photos",
        "name": "confident-senior-salesman-smiling-cheese-450w-414153475.jpg",
        "size": 34329,
        "atime": "2019-06-30T12:36:26.890Z",
        "mtime": "2019-06-30T12:23:29.968Z",
        "ctime": "2019-06-30T12:38:06.527Z"
      },
      {
        "container": "photos",
        "name": "confident-smiling-supermarket-clerk-posing-450w-503419726.jpg",
        "size": 31280,
        "atime": "2019-06-30T12:36:26.929Z",
        "mtime": "2019-06-30T12:21:26.054Z",
        "ctime": "2019-06-30T12:38:06.559Z"
      },
      {
        "container": "photos",
        "name": "glad-young-seller-apron-picking-450w-546063784.jpg",
        "size": 50081,
        "atime": "2019-06-30T12:36:26.976Z",
        "mtime": "2019-06-30T12:22:48.170Z",
        "ctime": "2019-06-30T12:38:06.536Z"
      },
      {
        "container": "photos",
        "name": "grocery-store-employee-reading-inventory-450w-463716797.jpg",
        "size": 40645,
        "atime": "2019-06-30T12:36:27.016Z",
        "mtime": "2019-06-30T12:16:36.294Z",
        "ctime": "2019-06-30T12:38:06.495Z"
      },
      {
        "container": "photos",
        "name": "istanbul-turkey-7-april-2017-450w-627229367.jpg",
        "size": 52665,
        "atime": "2019-06-30T12:36:27.057Z",
        "mtime": "2019-06-30T12:24:36.487Z",
        "ctime": "2019-06-30T12:38:06.510Z"
      },
      {
        "container": "photos",
        "name": "owner-commercial-business-his-shop-450w-778370077.jpg",
        "size": 20775,
        "atime": "2019-06-30T12:36:27.098Z",
        "mtime": "2019-06-30T12:23:00.246Z",
        "ctime": "2019-06-30T12:38:06.465Z"
      },
      {
        "container": "photos",
        "name": "portrait-cheerful-male-seller-having-450w-484550425.jpg",
        "size": 42949,
        "atime": "2019-06-30T12:36:27.143Z",
        "mtime": "2019-06-30T12:20:40.380Z",
        "ctime": "2019-06-30T12:38:06.519Z"
      },
      {
        "container": "photos",
        "name": "portrait-confident-shopkeeper-butchery-450w-364815440.jpg",
        "size": 28346,
        "atime": "2019-06-30T12:36:27.183Z",
        "mtime": "2019-06-30T12:18:19.177Z",
        "ctime": "2019-06-30T12:38:06.474Z"
      },
      {
        "container": "photos",
        "name": "portrait-happy-senior-male-owner-450w-148484213.jpg",
        "size": 30968,
        "atime": "2019-06-30T12:36:27.223Z",
        "mtime": "2019-06-30T12:17:00.754Z",
        "ctime": "2019-06-30T12:38:06.450Z"
      },
      {
        "container": "photos",
        "name": "portrait-happy-young-salesman-vegetable-450w-120038572.jpg",
        "size": 40506,
        "atime": "2019-06-30T12:36:27.276Z",
        "mtime": "2019-06-30T12:17:14.909Z",
        "ctime": "2019-06-30T12:38:06.445Z"
      },
      {
        "container": "photos",
        "name": "portrait-mid-adult-salesman-holding-450w-218092903.jpg",
        "size": 47043,
        "atime": "2019-06-30T12:36:26.729Z",
        "mtime": "2019-06-30T12:15:35.749Z",
        "ctime": "2019-06-30T12:38:06.439Z"
      },
      {
        "container": "photos",
        "name": "portrait-shopman-isolated-on-white-450w-377885044.jpg",
        "size": 11661,
        "atime": "2019-06-30T12:36:27.324Z",
        "mtime": "2019-06-30T12:22:33.367Z",
        "ctime": "2019-06-30T12:38:06.425Z"
      },
      {
        "container": "photos",
        "name": "portrait-smiling-cheerful-glad-man-450w-1088308433.jpg",
        "size": 41318,
        "atime": "2019-06-30T12:36:27.383Z",
        "mtime": "2019-06-30T12:16:47.965Z",
        "ctime": "2019-06-30T12:38:06.485Z"
      },
      {
        "container": "photos",
        "name": "portrait-smiling-cheerful-glad-man-450w-768139951.jpg",
        "size": 39357,
        "atime": "2019-06-30T12:36:27.359Z",
        "mtime": "2019-06-30T12:17:51.219Z",
        "ctime": "2019-06-30T12:38:06.457Z"
      },
      {
        "container": "photos",
        "name": "salesman-offering-salted-olives-filling-450w-770289679.jpg",
        "size": 44952,
        "atime": "2019-06-30T12:36:27.407Z",
        "mtime": "2019-06-30T12:22:08.126Z",
        "ctime": "2019-06-30T12:38:06.408Z"
      },
      {
        "container": "photos",
        "name": "salesman-offers-apple-street-market-450w-410332369.jpg",
        "size": 21232,
        "atime": "2019-06-30T12:36:27.426Z",
        "mtime": "2019-06-30T12:21:54.008Z",
        "ctime": "2019-06-30T12:38:06.420Z"
      },
      {
        "container": "photos",
        "name": "seller-takes-money-customer-market-450w-410332498.jpg",
        "size": 20938,
        "atime": "2019-06-30T12:36:27.447Z",
        "mtime": "2019-06-30T12:22:19.310Z",
        "ctime": "2019-06-30T12:38:06.414Z"
      },
      {
        "container": "photos",
        "name": "senior-woman-working-small-grocery-450w-1369726415.jpg",
        "size": 25892,
        "atime": "2019-06-30T12:36:27.749Z",
        "mtime": "2019-06-30T12:16:16.453Z",
        "ctime": "2019-06-30T12:38:06.434Z"
      },
      {
        "container": "photos",
        "name": "small-shop-owner-entrepreneur-sales-450w-86350876.jpg",
        "size": 17704,
        "atime": "2019-06-30T12:36:27.769Z",
        "mtime": "2019-06-30T12:23:16.727Z",
        "ctime": "2019-06-30T12:38:06.402Z"
      },
      {
        "container": "photos",
        "name": "smiling-pensive-young-woman-using-450w-564798520.jpg",
        "size": 42746,
        "atime": "2019-06-30T12:36:27.787Z",
        "mtime": "2019-06-30T12:24:04.023Z",
        "ctime": "2019-06-30T12:38:06.391Z"
      },
      {
        "container": "photos",
        "name": "smiling-shopkeeper-grocery-store-450w-390087511.jpg",
        "size": 41882,
        "atime": "2019-06-30T12:36:27.803Z",
        "mtime": "2019-06-30T12:24:49.520Z",
        "ctime": "2019-06-30T12:38:06.397Z"
      },
      {
        "container": "photos",
        "name": "smiling-supermarket-employee-holding-pc-450w-341236202.jpg",
        "size": 22167,
        "atime": "2019-06-30T12:36:27.818Z",
        "mtime": "2019-06-30T12:18:44.315Z",
        "ctime": "2019-06-30T12:38:06.385Z"
      },
      {
        "container": "photos",
        "name": "smiling-worker-posing-behind-counter-450w-292337039.jpg",
        "size": 28473,
        "atime": "2019-06-30T12:36:27.836Z",
        "mtime": "2019-06-30T12:23:48.306Z",
        "ctime": "2019-06-30T12:38:06.379Z"
      },
      {
        "container": "photos",
        "name": "woman-working-cafe-450w-322027667.jpg",
        "size": 28694,
        "atime": "2019-06-30T12:36:27.857Z",
        "mtime": "2019-06-30T12:17:37.830Z",
        "ctime": "2019-06-30T12:38:06.373Z"
      },
      {
        "container": "photos",
        "name": "young-smiling-saleswoman-portrait-inside-450w-203133235.jpg",
        "size": 19018,
        "atime": "2019-06-30T12:36:27.877Z",
        "mtime": "2019-06-30T12:18:07.971Z",
        "ctime": "2019-06-30T12:38:06.365Z"
      },
      {
        "container": "photos",
        "name": "young-worker-holding-different-cheeses-450w-1033460800.jpg",
        "size": 29633,
        "atime": "2019-06-30T12:36:27.896Z",
        "mtime": "2019-06-30T12:18:33.318Z",
        "ctime": "2019-06-30T12:38:06.350Z"
      }
    ];

    const merchantList = [
      {
        "firstName": "Alexis",
        "lastName": "Rolland",
        "creationDate": "2020-06-05T08:14:46-07:00",
        "email": "iaculis.nec@commodo.edu",
        "phone": "02 77 57 68 13",
        "incoming": 2983,
        "holidays": 23,
        "lastUpdated": "2020-02-27T16:31:49-08:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Kilian",
        "lastName": "Andre",
        "creationDate": "2020-01-25T15:59:22-08:00",
        "email": "ligula.Aenean@fermentumrisusat.co.uk",
        "phone": "03 56 01 03 91",
        "incoming": 2139,
        "holidays": 30,
        "lastUpdated": "2020-04-29T08:56:53-07:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Lucas",
        "lastName": "Joly",
        "creationDate": "2019-05-11T01:32:34-07:00",
        "email": "enim.sit@quistristique.edu",
        "phone": "04 25 20 57 60",
        "incoming": 1631,
        "holidays": 4,
        "lastUpdated": "2018-11-19T19:55:14-08:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Evan",
        "lastName": "Arnaud",
        "creationDate": "2019-08-31T12:47:55-07:00",
        "email": "metus@fermentum.net",
        "phone": "02 96 25 03 59",
        "incoming": 2436,
        "holidays": 10,
        "lastUpdated": "2019-07-15T05:55:09-07:00",
        "deleted": "false",
        "marketId": "1"
      },
      {
        "firstName": "Anthony",
        "lastName": "Dupuy",
        "creationDate": "2018-09-15T18:01:40-07:00",
        "email": "nascetur.ridiculus.mus@blanditatnisi.org",
        "phone": "08 63 23 98 74",
        "incoming": 1286,
        "holidays": 2,
        "lastUpdated": "2020-02-16T06:33:35-08:00",
        "deleted": "false",
        "marketId": "5"
      },
      {
        "firstName": "Nolan",
        "lastName": "Caron",
        "creationDate": "2020-06-12T16:54:55-07:00",
        "email": "rutrum@netuset.com",
        "phone": "05 24 64 61 59",
        "incoming": 2333,
        "holidays": 30,
        "lastUpdated": "2018-09-18T05:56:07-07:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Robin",
        "lastName": "Noel",
        "creationDate": "2019-09-12T09:03:51-07:00",
        "email": "sit.amet.dapibus@magnaatortor.ca",
        "phone": "01 86 87 48 37",
        "incoming": 3537,
        "holidays": 29,
        "lastUpdated": "2018-11-24T00:18:31-08:00",
        "deleted": "false",
        "marketId": "8"
      },
      {
        "firstName": "Florian",
        "lastName": "Deschamps",
        "creationDate": "2018-11-09T14:40:01-08:00",
        "email": "Aliquam@semvitae.ca",
        "phone": "01 57 02 09 64",
        "incoming": 2419,
        "holidays": 24,
        "lastUpdated": "2019-07-02T18:29:18-07:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Davy",
        "lastName": "Guerin",
        "creationDate": "2018-07-11T16:46:56-07:00",
        "email": "tempus.non@eueleifendnec.org",
        "phone": "07 64 78 44 64",
        "incoming": 1173,
        "holidays": 13,
        "lastUpdated": "2019-04-04T21:45:43-07:00",
        "deleted": "false",
        "marketId": "1"
      },
      {
        "firstName": "Lorenzo",
        "lastName": "Bourgeois",
        "creationDate": "2019-08-10T19:43:42-07:00",
        "email": "arcu.imperdiet.ullamcorper@Aeneangravidanunc.ca",
        "phone": "04 10 92 86 73",
        "incoming": 2114,
        "holidays": 8,
        "lastUpdated": "2019-11-19T15:54:35-08:00",
        "deleted": "false",
        "marketId": "7"
      },
      {
        "firstName": "Amine",
        "lastName": "Colin",
        "creationDate": "2019-05-30T16:35:34-07:00",
        "email": "vulputate@eu.ca",
        "phone": "03 53 62 19 08",
        "incoming": 1655,
        "holidays": 22,
        "lastUpdated": "2019-04-29T13:14:51-07:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Bruno",
        "lastName": "Picard",
        "creationDate": "2018-11-05T08:13:03-08:00",
        "email": "fermentum@ultricesaauctor.com",
        "phone": "07 16 00 36 19",
        "incoming": 2878,
        "holidays": 14,
        "lastUpdated": "2019-11-13T23:35:18-08:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Benjamin",
        "lastName": "Gomez",
        "creationDate": "2020-02-04T23:18:50-08:00",
        "email": "dictum.augue.malesuada@nequeSedeget.com",
        "phone": "09 18 74 71 31",
        "incoming": 917,
        "holidays": 4,
        "lastUpdated": "2020-04-06T04:13:21-07:00",
        "deleted": "false",
        "marketId": "7"
      },
      {
        "firstName": "Kylian",
        "lastName": "Sanchez",
        "creationDate": "2019-07-01T01:29:04-07:00",
        "email": "fermentum.vel@incursus.co.uk",
        "phone": "07 23 95 48 93",
        "incoming": 2455,
        "holidays": 3,
        "lastUpdated": "2019-05-06T13:03:49-07:00",
        "deleted": "false",
        "marketId": "7"
      },
      {
        "firstName": "Grégory",
        "lastName": "Legrand",
        "creationDate": "2020-04-13T10:44:47-07:00",
        "email": "nec@mauriserat.ca",
        "phone": "01 81 94 10 77",
        "incoming": 2195,
        "holidays": 2,
        "lastUpdated": "2019-06-03T16:15:32-07:00",
        "deleted": "false",
        "marketId": "8"
      },
      {
        "firstName": "Noë",
        "lastName": "Giraud",
        "creationDate": "2020-01-11T12:09:30-08:00",
        "email": "metus.urna.convallis@elitelitfermentum.org",
        "phone": "06 85 65 58 96",
        "incoming": 2140,
        "holidays": 4,
        "lastUpdated": "2019-04-18T03:07:57-07:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Marwane",
        "lastName": "Arnaud",
        "creationDate": "2019-02-26T17:19:16-08:00",
        "email": "sit@dictumultriciesligula.edu",
        "phone": "02 83 80 39 05",
        "incoming": 2926,
        "holidays": 27,
        "lastUpdated": "2019-06-14T17:30:07-07:00",
        "deleted": "false",
        "marketId": "1"
      },
      {
        "firstName": "Timothée",
        "lastName": "Julien",
        "creationDate": "2020-04-20T03:59:31-07:00",
        "email": "fermentum.convallis.ligula@Donecnibh.edu",
        "phone": "02 88 71 13 75",
        "incoming": 2570,
        "holidays": 23,
        "lastUpdated": "2018-07-29T16:12:44-07:00",
        "deleted": "false",
        "marketId": "11"
      },
      {
        "firstName": "Pierre",
        "lastName": "Remy",
        "creationDate": "2018-09-07T11:57:11-07:00",
        "email": "Praesent@molestie.com",
        "phone": "05 07 78 55 87",
        "incoming": 1631,
        "holidays": 7,
        "lastUpdated": "2020-03-12T10:31:24-07:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Benjamin",
        "lastName": "Guerin",
        "creationDate": "2018-12-08T07:02:05-08:00",
        "email": "In.faucibus.Morbi@arcuvel.edu",
        "phone": "08 62 07 44 69",
        "incoming": 324,
        "holidays": 1,
        "lastUpdated": "2019-03-07T23:00:47-08:00",
        "deleted": "false",
        "marketId": "6"
      },
      {
        "firstName": "Yanis",
        "lastName": "Paul",
        "creationDate": "2020-02-08T21:02:35-08:00",
        "email": "adipiscing.lacus.Ut@elitpellentesquea.com",
        "phone": "06 20 47 70 30",
        "incoming": 709,
        "holidays": 6,
        "lastUpdated": "2019-01-28T23:23:07-08:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Dimitri",
        "lastName": "Perrot",
        "creationDate": "2018-11-15T10:54:47-08:00",
        "email": "parturient.montes@Etiamligula.com",
        "phone": "05 22 71 57 03",
        "incoming": 3112,
        "holidays": 22,
        "lastUpdated": "2018-10-19T11:52:03-07:00",
        "deleted": "false",
        "marketId": "1"
      },
      {
        "firstName": "Corentin",
        "lastName": "Giraud",
        "creationDate": "2019-12-30T02:06:37-08:00",
        "email": "odio.a.purus@dapibusrutrumjusto.net",
        "phone": "01 23 30 87 22",
        "incoming": 2829,
        "holidays": 3,
        "lastUpdated": "2018-07-23T04:37:26-07:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Léon",
        "lastName": "Clement",
        "creationDate": "2019-05-10T12:57:56-07:00",
        "email": "consequat.auctor.nunc@ullamcorpernislarcu.edu",
        "phone": "07 39 70 03 59",
        "incoming": 2721,
        "holidays": 1,
        "lastUpdated": "2020-03-16T23:47:23-07:00",
        "deleted": "false",
        "marketId": "5"
      },
      {
        "firstName": "Mathis",
        "lastName": "Menard",
        "creationDate": "2020-01-13T23:54:03-08:00",
        "email": "In.at@congue.org",
        "phone": "04 91 78 64 47",
        "incoming": 416,
        "holidays": 2,
        "lastUpdated": "2019-03-23T08:58:48-07:00",
        "deleted": "false",
        "marketId": "5"
      },
      {
        "firstName": "Alexis",
        "lastName": "Rolland",
        "creationDate": "2019-04-10T20:29:33-07:00",
        "email": "luctus.vulputate.nisi@faucibus.net",
        "phone": "08 63 98 43 58",
        "incoming": 2163,
        "holidays": 7,
        "lastUpdated": "2018-12-06T10:51:29-08:00",
        "deleted": "false",
        "marketId": "5"
      },
      {
        "firstName": "Renaud",
        "lastName": "Mallet",
        "creationDate": "2019-02-03T18:47:49-08:00",
        "email": "id.magna@nulla.ca",
        "phone": "04 92 30 05 09",
        "incoming": 3164,
        "holidays": 8,
        "lastUpdated": "2019-07-24T01:14:43-07:00",
        "deleted": "false",
        "marketId": "2"
      },
      {
        "firstName": "Gabin",
        "lastName": "Paul",
        "creationDate": "2018-10-03T17:37:14-07:00",
        "email": "ipsum@luctussit.org",
        "phone": "07 85 14 28 79",
        "incoming": 66,
        "holidays": 22,
        "lastUpdated": "2019-03-06T19:16:40-08:00",
        "deleted": "false",
        "marketId": "8"
      },
    ];
    let merchantListToUpload=[];
    pictureList.forEach((picture,index)=>{
      merchantList[index].pictureFileName = picture.name;
      merchantListToUpload.push(merchantList[index]);
      if (index>10) return;
    });
    console.log(merchantListToUpload);
    await Merchant.create(merchantListToUpload);

    //get portraits list
    callback (null,true);
  }

  };

