/**
 * NPM Module dependencies.
 */
const express = require('express');
const trackRoute = express.Router();
const multer = require('multer');

const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const cors = require("cors") //Newly added

require("dotenv").config();

const mongoose = require("mongoose");
require("./config/database").connect();
const auth = require("./middleware/auth");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * NodeJS Module dependencies.
 */
const { Readable } = require('stream');

/**
 * Create Express server && Express Router configuration.
 */
const app = express();
app.use(cors()) // Newly added


app.get('/', cors(), auth, (req, res) => {
  res.status(200).send("Welcome 🙌");
});






app.use(express.json());

// Logic goes here

// importing user context
const User = require("./model/user");
const Track = require("./model/track");

// Register
app.post("/register", async (req, res) => {

        // Our register logic starts here
         try {
          // Get user input
          const { firstName, lastName, email, password } = req.body;
      
          // Validate user input
          if (!(email && password && firstName && lastName)) {
            res.status(400).send("All input is required");
          }
      
          // check if user already exist
          // Validate if user exist in our database
          const oldUser = await User.findOne({ email });
      
          if (oldUser) {
            return res.status(409).send("User Already Exists. Please Login.");
          }
      
          //Encrypt user password
          encryptedUserPassword = await bcrypt.hash(password, 10);
      
          // Create user in our database
          const user = await User.create({
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(), // sanitize
            password: encryptedUserPassword,
          });
      
          // Create token
          const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
              expiresIn: "5h",
            }
          );
          // save user token
          user.token = token;
      
          // return new user
          res.status(201).json(user);
        } catch (err) {
          console.log(err);
        }
        // Our register logic ends here
      });


// Login
app.post("/login", async (req, res) => {

        // Our login logic starts here
         try {
          // Get user input
          const { email, password } = req.body;
      
          // Validate user input
          if (!(email && password)) {
            res.status(400).send("All input is required");
          }
          // Validate if user exist in our database
          const user = await User.findOne({ email });
      
          if (user && (await bcrypt.compare(password, user.password))) {
            // Create token
            const token = jwt.sign(
              { user_id: user._id, email },
              process.env.TOKEN_KEY,
              {
                expiresIn: "5h",
              }
            );
      
            // save user token
            user.token = token;
      
            // user
            return res.status(200).json(user);
          }
          return res.status(400).send("Invalid Credentials");

        }
        catch{
            return res.status(400).send("Invalid Credentials");
        }
          
});














/**
 * Connect Mongo Driver to MongoDB.
 */
//  async function main(){
//   /**
//    * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
//    * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
//    */
//   const uri = "mongodb+srv://nikxtaco:ethernals-password@cluster0.m4mnd.mongodb.net/users?retryWrites=true&w=majority";

//   const { MONGO_URI } = process.env;

//   const client = new MongoClient(uri);

//   try {
//       // Connect to the MongoDB cluster
//       await client.connect();

//       // Make the appropriate DB calls
//       await  listDatabases(client);

//   } catch (e) {
//       console.error(e);
//   } finally {
//       await client.close();
//   }
// }

// main().catch(console.error);



// mongodb://localhost/trackDB
let db;
// MongoClient.connect(`mongodb://localhost/trackDB`, (err, client) => {
//   if (err) {
//     console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
//     process.exit(1);
//   }
//   db = client.db('trackDB');
// });


let bucket;
mongoose.connection.on("connected", () => {
  var db = mongoose.connections[0].db;
  bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "newBucket"
  });
  console.log(bucket);
});


app.use('/tracks', trackRoute);


/**
 * GET /tracks/:trackID
 */
trackRoute.get('/:trackID', (req, res) => {
  try {
    var trackID = new ObjectID(req.params.trackID);
  } catch(err) {
    return res.status(400).json({ message: "Invalid trackID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" }); 
  }
  res.set('content-type', 'audio/mp3');
  res.set('accept-ranges', 'bytes');

  // let bucket = new mongodb.GridFSBucket(db, {
  //   bucketName: 'tracks'
  // });

  let downloadStream = bucket.openDownloadStream(trackID);

  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });

  downloadStream.on('error', () => {
    res.sendStatus(404);
  });

  downloadStream.on('end', () => {
    res.end();
  });
});




/**
 * POST /tracks
 */
trackRoute.post('/', (req, res) => {
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage, limits: { fields: 2, fileSize: 6000000, files: 1, parts: 3 }});
  upload.single('track')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: "Upload Request Validation Failed" });
    } else if(!req.body.name) {
      return res.status(400).json({ message: "No track name in request body" });
    }
    
    let trackName = req.body.name;
    let artistName = req.body.artist;

    // const oldTrack = await Track.findOne({ trackName });
      
    //       if (oldTrack) {
    //         return res.status(409).send("Track Name Already Exists. Please Upload Another.");
    //       }

    // Covert buffer to Readable Stream
    const readableTrackStream = new Readable();
    readableTrackStream.push(req.file.buffer);
    readableTrackStream.push(null);

    // let bucket = new mongodb.GridFSBucket(db, {
    //   bucketName: 'tracks'
    // });

    let uploadStream = bucket.openUploadStream(trackName);
    let id = uploadStream.id;
    readableTrackStream.pipe(uploadStream);

    uploadStream.on('error', () => {
      return res.status(500).json({ message: "Error uploading file" });
    });

    uploadStream.on('finish', async () => {
      const track = await Track.create({
        track_name: trackName,
        artist_name: artistName,
        play_id: id,
      });
  
      // return new track
      res.status(201).json(track);



      // return res.status(201).json({ message: "File uploaded successfully, stored under Mongo ObjectID: " + id });  
    });
  });
});










/**
 * GET /tracks/trackDetails
 */
 trackRoute.get('/', (req, res) => {
  res.set('content-type', 'application/json');
  Track.find({}, function(err, result) 
  {
    if(err) throw err;
    return res.send(result);
  });
});



module.exports = app;