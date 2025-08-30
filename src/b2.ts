import B2 from "backblaze-b2";
import dotenv from "dotenv";

dotenv.config();

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID as string,
  applicationKey: process.env.B2_APPLICATION_KEY as string,

  //bucketId: process.env.B2_BUCKET_ID as string
});

export const initB2 = async (): Promise<void> => {
  try {
    await b2.authorize();
    console.log("Connected successfully to B2");
  } catch (error) {
    //console.log(error);
    console.log("error occured");
  }
};
export { b2 };
