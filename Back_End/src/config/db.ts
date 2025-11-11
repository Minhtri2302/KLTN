import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(` Error connecting to MongoDB: ${error.message}`);
    } else {
      console.error(' Unknown error connecting to MongoDB', error);
    }
    process.exit(1);
  }
};

export { connectDB, mongoose };
