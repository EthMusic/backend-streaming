const http = require("http");
const app = require("./server");
const server = http.createServer(app);

const { API_PORT } = process.env;
const port = process.env.PORT || 4001;

// server listening 
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});