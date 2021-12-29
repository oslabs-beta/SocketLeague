const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('dotenv').config();


// const MONGO_URI = 
//   'mongodb+srv://samflam:upBPnFCW1Gwmeo2hVpD7okpKeJmCfiICk1HzcRH7@cluster0.foabe.mongodb.net/SocketLeague?retryWrites=true&w=majority';

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(err))


  const clientSchema = new Schema({
    // timestamp: { type: Date, required: true, default: ()=>new Date() },
    session: {type: String, required: true},
    state: {type: Object, required: true}
  });

  module.exports = mongoose.model('Client', clientSchema)