# Streaming

### Setup

npm install

node .

### Endpoints

#### Register User

https://peaceful-bayou-84238.herokuapp.com/register

Body: firstName + lastName + email + password

#### Login User

https://peaceful-bayou-84238.herokuapp.com/login

Body: email + password

#### Get All Tracks 

https://peaceful-bayou-84238.herokuapp.com/tracks

#### Upload One Track

https://peaceful-bayou-84238.herokuapp.com/tracks

Body: name + artist + track (mp3 below 1MB)

#### Play One Track

https://peaceful-bayou-84238.herokuapp.com/tracks/<trackID>

#### Get All Users 

https://peaceful-bayou-84238.herokuapp.com/users

#### Get One User

https://peaceful-bayou-84238.herokuapp.com/users/<userID>

#### Update One User (Ex. To add / delete NFTs from account)

https://peaceful-bayou-84238.herokuapp.com/users/<userID>

Body: firstName + lastName + email + password + tracks (array of strings which are track IDs)

### Localhost alternative

npm install -g localtunnel

lt --port 4001

### Note

Sample Track Streaming Link: https://peaceful-bayou-84238.herokuapp.com/tracks/6245b2a80b74bf8d7e64328b

Database In Use: ethmusic