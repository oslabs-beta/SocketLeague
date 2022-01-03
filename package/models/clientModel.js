import mongoose from 'mongoose';
const Schema = mongoose.Schema;
import dotenv from "dotenv";
dotenv.config();

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

  // module.exports = mongoose.model('Client', clientSchema)
  export default mongoose.model('Client', clientSchema);