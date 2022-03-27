# Streaming

### Setup

npm install
node .

### Endpoints

POST - http://localhost:4001/tracks - with track (mp3 below 1MB) and name.
GET - http://localhost:4001/tracks/<trackID received from post request>
Ex. http://localhost:4001/tracks/6240046e836ca857e8cfce6c

### Localhost alternative
npm install -g localtunnel
lt --port 4001