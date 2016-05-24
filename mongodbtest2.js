/* eslint-disable */

//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27017/my_database_name';

// Use connect method to connect to the Server
MongoClient.connect(url, function (err, db) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
  } else {
    //HURRAY!! We are connected. :)
    console.log('Connection established to', url);

    // do some work here with the database.
    var collection = db.collection('users')

    // //Create some users
    // var user1 = {name: 'modulus admin', age: 42, roles: ['admin', 'moderator', 'user']};
    // var user2 = {name: 'modulus user', age: 22, roles: ['user']};
    // var user3 = {name: 'modulus super admin', age: 92, roles: ['super-admin', 'admin', 'moderator', 'user']};

    var user1 = {name: 'haseeb1', age: 21, board: ' PBBP ', roles: ['admin', 'moderator', 'user']};

    // Insert some users
    collection.insert([user1], function (err, result) {
        if (err) {
            console.error(err);
        } else {
            console.log('Inserted %d documents into the "users" collection. The documents inserted with "_id" are:', result.length, result)
            console.log('The _id of this entry is: ' + result.ops[0]._id)
        }
        //Close connection
        db.close();
    })
    //
    // // updating some specific user
    // collection.update({name: 'modulus user'}, {$set: {enabled: false}}, function (err, numUpdated) {
    //   if (err) {
    //     console.log(err);
    //   } else if (numUpdated) {
    //     console.log('Updated Successfully %d document(s).', numUpdated);
    //   } else {
    //     console.log('No document found with defined "find" criteria!');
    //   }
    // //   //Close connection
    // //   db.close();
    // });

    // // finding some document
    // collection.find({name: 'modulus user'}).toArray(function (err, result) {
    //   if (err) {
    //     console.log(err);
    //   } else if (result.length) {
    //     console.log('Found:', result);
    //   } else {
    //     console.log('No document(s) found with defined "find" criteria!');
    //   }
    //   //Close connection
    //   db.close();
    // });

    // //Close connection
    // db.close();
  }
});
