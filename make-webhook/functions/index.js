const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const request = require("request-promise");
const express = require("express");
const app = express();
const region = "asia-southeast1";

const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer WK6gkQSIcedlwVVquJkAR3BnQTEUvWfLXRvAqOPBBSt0mvX7+b4cu2Q+wg4sn2XjVPtwlCkmqAWAIua1HyZSdj1k/Xpozurpdw+jMHN3aW41iEEcCJE2/SFNsmoVwbrv1CoBihfCjypx0ZYT66VusgdB04t89/1O/w1cDnyilFU=`,
};

const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const dialogflow = require("dialogflow");
const projectId = "chat-project-bef27";
const sessionClient = new dialogflow.SessionsClient({
  projectId,
  keyFilename: "chat-project-bef27-72a3467da386.json",
});
//======================================================================================================================

//=========================================== handle event =============================================================
async function handleEvent(req, event) {
  switch (event.type) {
    case "message":
      switch (event.message.type) {
        case "text":
          return addChatHistory(req, event);
      }
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}
//============================================================================================================================

//==================================== add chat history in firebase firestore ===============================================
function addChatHistory(req, event) {
  const userId = event.source.userId;
  const timestamp = event.timestamp;
  const userText = event.message.text;
  const addchatHis = db
    .collection("chat-history")
    .doc()
    .set({
      userId: userId,
      Message: userText,
      timestamp: timestamp,
    })
    .catch((err) => {
      console.log(err);
    });
}
//==================================================================================================

//===================== function detectIntent api dialogflow 3.=====================================
async function detectIntentApi(req, event) {
  const userId = event.source.userId;
  const userText = event.message.text;

  const intentResponse = await detectIntent(userId, message, "th");
  const structjson = require("./structjson");
  const intentResponseMessage = intentResponse.queryResult.fulfillmentMessages;
  const replyMessage = intentResponseMessage.map((messageObj) => {
    let struct;
    if (messageObj.message === "text") {
      return { type: "text", text: messageObj.text.text[0] };
    } else if (messageObj.message === "payload") {
      struct = messageObj.payload;
      return structjson.structProtoToJson(struct);
    }
    request({
      method: "POST",
      uri: `${LINE_MESSAGING_API}/reply`,
      headers: LINE_HEADER,
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: replyMessage,
      }),
    });
  });

  const detectIntent = async (userId, userText, languageCode) => {
    const sessionPath = sessionClient.sessionPath(projectId, userId);
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userText,
          languageCode: languageCode,
        },
      },
    };
    const response = await sessionClient.detectIntent(request);
    return response[0];
  };
}
//======================================================================================================

//======================== line middle ware by Express js ====================================================
app.post("/webhook", line.middleware(config), async (req, res) => {
  Promise.all(
    req.body.events.map((event) => {
      return handleEvent(req, event);
    })
  );
  res.status(200).end();
});
//========================================================================================================

//======================= cloud function with express ====================================================
exports.api = functions.region(region).https.onRequest(app);
