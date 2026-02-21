const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => logger.info("Success: Fully authenticated!"))
      .catch((err) => {
        if (err.message.includes("auth failed")) {
          logger.error("Error: Check your Username and Password.");
        } else {
          logger.error("Connection Error:", err.message);
        }
      });

    // Test if the user can actually see collections
    mongoose.connection.on("open", function () {
      // Now it is safe to check permissions
      mongoose.connection.db.listCollections().toArray((err, names) => {
        if (err) console.error("Permission Error:", err);
        else console.log("Success! I can see these collections:", names);
      });
    });
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
