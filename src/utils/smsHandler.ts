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

export const SendSms = async (
  message: string,
  receiver: string
): Promise<"delivered" | "not delivered"> => {
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

  return new Promise((resolve) => {
    request(options, (error, response) => {
      if (error) {
        console.error("SMS error:", error);
        resolve("not delivered");
      } else {
        console.log("Message sent");
        resolve("delivered");
      }
    });
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
