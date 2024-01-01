import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema({
  name: {
    type: "String",
    required: true,
  },
  by: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
});

mongoose.model("Quote", quoteSchema);
