import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PubSub } from "graphql-subscriptions";
const User = mongoose.model("User");
const Quote = mongoose.model("Quote");
const pubsub = new PubSub();  // Create a PubSub instance
const QUOTE_CREATED = "QUOTE_CREATED";
const resolvers = {
  Query: {
    users: async () => await User.find(),
    user: async (_, { _id }) => await User.findOne({ _id }),
    quotes: async () => await Quote.find({}).populate("by", "_id firstName"),
    iquote: async (_, { by }) => await Quote.find({ by }),
    myprofile: async (_, args, { userId }) => {
      if (!userId) {
        throw new Error("You must be logged in");
      }
      return await User.findOne({ _id: userId });
    },
  },

  User: {
    quotes: async (ur) => await Quote.find({ by: ur._id }),
  },

  Mutation: {
    signupUser: async (_, { userNew }) => {
      const user = await User.findOne({ email: userNew.email });
      if (user) {
        throw new Error("User already exists with that email");
      }
      const hashedPassword = await bcrypt.hash(userNew.password, 12);
      const newUser = new User({
        ...userNew,
        password: hashedPassword,
      });
      return await newUser.save();
    },
    signinUser: async (_, { userSignin }) => {
      const user = await User.findOne({ email: userSignin.email });
      if (!user) {
        throw new Error("User doesn't exists with that email");
      }

      const doMatch = await bcrypt.compare(userSignin.password, user.password);
      if (!doMatch) {
        throw new Error("Email or password is invalid!");
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      return { token };
    },

    createQuote: async (_, { name }, { userId }) => {
      if (!userId) {
        throw new Error("You must be logged in");
      }
      const newQuote = new Quote({
        name,
        by: userId,
      });
      await newQuote.save();

      // Publish the quoteCreated event
      const createdQuote = {
        name: newQuote.name,
        by: {
          _id: userId,
          firstName: (await User.findById(userId)).firstName,
        },
      };
      pubsub.publish(QUOTE_CREATED, { quoteCreated: createdQuote });

      return "Quote saved successfully";
    },
  },

  Subscription: {
    quoteCreated: {
      subscribe: () => pubsub.asyncIterator([QUOTE_CREATED]),
    },
  },
};

export default resolvers;
