import axios from "axios";
import request from "request";

export const digitalpulseapi =
  "https://mps.digitalpulseapi.net/1.0/send-sms/anq";
const SmsService = axios.create({
  baseURL: "https://mps.digitalpulseapi.net/1.0/send-sms/anq",
  headers: {
    "Content-Type": "application/json",
    "api-key": "JI72Yke0ClS737hPr9PEA==",
  },
});

export const SendSms = async (message: string, receiver: string) => {
  const data = {
    sender: "55019",
    message,

    receiver,
  };
  const options = {
    method: "POST",
    url: digitalpulseapi,
    headers: {
      "Content-Type": "application/json",
      "api-key": "JI72Yke0ClS737hPr9PEA==",
    },
    body: JSON.stringify(data),
  };

  //send message
  request(options, async function (error, response) {
    if (error) {
      console.log(new Error(error).message);
      return "not delivered";
    } else {
      console.log("Message sent");
      return "delivered";
    }
  });
};

SmsService.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      return { data: error.response.data, status: error.response.status };
    }
    return { data: "Cannot connect at this time", status: 500 };
  }
);

export default SmsService;
