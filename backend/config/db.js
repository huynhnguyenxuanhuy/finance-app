const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Missing MONGODB_URI');
    return false;
  }

  if (mongoose.connection.readyState === 1) return true;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(process.env.MONGODB_URI)
    .then((conn) => {
      console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
      return true;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error(`❌ MongoDB connection error: ${error.message}`);
      return false;
    });

  return connectionPromise;
};

module.exports = connectDB;
