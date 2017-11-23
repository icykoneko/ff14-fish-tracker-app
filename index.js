const express = require('express')
const app = express()

app.use(express.static(__dirname, {maxAge: 2592000000}))

app.listen(3000, function() {
  console.log('Listing on port 3000!')
})
