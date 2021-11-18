const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const express = require("express");
const app = express();
const region = "asia-southeast1";
const request = require("request-promise");
const structjson = require("./structjson");
//========================================== Line ==============================================================
const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer WK6gkQSIcedlwVVquJkAR3BnQTEUvWfLXRvAqOPBBSt0mvX7+b4cu2Q+wg4sn2XjVPtwlCkmqAWAIua1HyZSdj1k/Xpozurpdw+jMHN3aW41iEEcCJE2/SFNsmoVwbrv1CoBihfCjypx0ZYT66VusgdB04t89/1O/w1cDnyilFU=`,
};
//========================================== firebase firestore ====================================================
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
//=========================================== Dialog flow ============================================================
const dialogflow = require("@google-cloud/dialogflow");
const { user } = require("firebase-functions/lib/providers/auth");
const projectId = "chat-project-bef27";
//======================================================================================================================


//=========================================== handle event =============================================================
async function handleEvent(req, event) {
  switch (event.type) {
    case "message": {
      switch (event.message.type) {
        case "text":
          await addChatHistory(req, event);
          return await detectIntentApi(event);
      }
    }
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}
//============================================================================================================================

//===================== function detectIntent api dialogflow .=====================================
async function detectIntentApi(event) {
  const sessionClient = new dialogflow.SessionsClient({
    projectId,
    keyFilename: "chat-project-bef27-72a3467da386.json",
  });
  const userId = event.source.userId;
  console.log("Line Id : ", userId);
  const message = event.message.text;
  console.log("Text : ", message);
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, userId);
  const data = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: "th",
      },
    },
  };
  console.log("Data to Bot : ", data);
  const response = await sessionClient.detectIntent(data);
  const messgae = response[0].queryResult.fulfillmentText
    ? response[0].queryResult.fulfillmentText
    : "ฉันไม่รู้ค่ะ";
  return await replyToUser(event, messgae);
}

async function replyToUser(event, responseMasggase) {
  return request({
    method: "POST",
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: responseMasggase }],
    }),
  });
}
//======================================================================================================
//==================================== function add chat history in firebase firestore ===============================================
async function addChatHistory(req, event) {
  const userId = event.source.userId;
  const timestamp = event.timestamp;
  const message = event.message.text;
  const addchatHis = db
    .collection("chat-history")
    .doc()
    .set({
      userId: userId,
      Message: message,
      timestamp: timestamp,
    })
    .catch((err) => {
      console.log(err);
    });
}
//======================== line middle ware by Express js ====================================================
app.post("/webhook", line.middleware(config), async (req, res) => {
  const mapData = await Promise.all(
    req.body.events.map(async (event) => {
      return await handleEvent(req, event);
    })
  );
  await Promise.all(mapData);
  res.status(200).end();
});
//========================================================================================================

//======================= cloud function with express  ====================================================
exports.api = functions.region(region).https.onRequest(app);
