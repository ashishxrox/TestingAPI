const mongoose = require('mongoose');

const mongoose = require('mongoose')
const mongoURI = 'mongodb://localhost:27017/travelAgency'

async function connectToMongo(){
    await mongoose.connect(mongoURI).then(()=> console.log("Connected to Database Successfully")).catch(err=>console.log(err));
}


module.exports = connectToMongo