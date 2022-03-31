/* Requirements */

const express = require('express');
const multer = require('multer');
const mongoose = require("mongoose");
const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const cors = require("cors") 
const auth = require("./middleware/auth");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require("dotenv").config();
require("./config/database").connect();
const { Readable } = require('stream');

/* Model Imports */

const User = require("./model/user");
const Track = require("./model/track");

/* Routes */

const trackRoute = express.Router();
const userRoute = express.Router();

const app = express();
app.use(cors()) 

/* Page that will only be accessible when logged in */

app.get('/', cors(), auth, (req, res) => {
  res.status(200).send("Welcome 🙌");
});

app.use(express.json());

// Register
app.post("/register", async (req, res) => {
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
      tracks: [],
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
});

// Login
app.post("/login", async (req, res) => {
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

/* Creating Bucket to Save Tracks */

let db;
let bucket;
mongoose.connection.on("connected", () => {
  var db = mongoose.connections[0].db;
  bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "newBucket"
  });
  console.log(bucket);
});

/* Common Route for Track Manipulation */

app.use('/tracks', trackRoute);

/* GET /tracks */

trackRoute.get('/', (req, res) => {
  res.set('content-type', 'application/json');
  Track.find({}, function(err, result) 
  {
    if(err) throw err;
    return res.send(result);
  });
});

/* POST /tracks */

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

    // Convert buffer to Readable Stream
    const readableTrackStream = new Readable();
    readableTrackStream.push(req.file.buffer);
    readableTrackStream.push(null);

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
    });
  });
});

/* GET /tracks/:trackID */

trackRoute.get('/:trackID', (req, res) => {
  try {
    var trackID = new ObjectID(req.params.trackID);
  } catch(err) {
    return res.status(400).json({ message: "Invalid trackID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" }); 
  }
  res.set('content-type', 'audio/mp3');
  res.set('accept-ranges', 'bytes');

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

/* Common Route for User Manipulation */

app.use('/users', userRoute);

/* GET /users */

userRoute.get('/', (req, res) => {
  res.set('content-type', 'application/json');
  User.find({}, function(err, result) 
  {
    if(err) throw err;
    return res.send(result);
  });
});

/* GET /user/:userID */

userRoute.get('/:userID', async (req, res) => {
  try {
    var userID = new ObjectID(req.params.userID);
  } catch(err) {
    return res.status(400).json({ message: "Invalid userID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" }); 
  }
  res.set('content-type', 'application/json');

  const existingUser = await User.findOne({ userID });

  if (existingUser) {
    return res.status(201).send(existingUser);
  }  
});

/* POST /user/:userID */

userRoute.post("/:userID", async (req, res) => {
  try {
  // Get user input
  const { firstName, lastName, email, password, tracks } = req.body;

  // Validate user input
  if (!(email && password && firstName && lastName && tracks)) {
    res.status(400).send("All input is required");
  }

   // create a filter for a movie to update
   const filter = { email: email };
   // this option instructs the method to create a document if no documents match the filter
   const options = { upsert: false };
   // create a document that sets the plot of the movie
   const updateDoc = {
     $set: {
       first_name: firstName,
       last_name: lastName,
       email: email,
       password: password,
       tracks: tracks
     },
   };
   const result = await User.updateOne(filter, updateDoc, options);
   // return new user
  res.status(201).json(result);

} catch (err) {
  console.log(err);
}
});

module.exports = app;