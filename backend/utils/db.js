import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
//database connection is not fast..like it may take time
//so we have used async await
const connectDB = async () => {
 try{
    await mongoose.connect(process.env.MONGO_URL);
    //await means it will wait until the connection is established
    console.log("MongoDB connected");
    //now here it will show the message that mongodb is connected
 }catch(error){
    console.log("MongoDB connection failed");
    //if not connection possible..then this catch block will run
    console.error(error);
 }
}

export default connectDB;