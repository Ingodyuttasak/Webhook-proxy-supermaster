const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const request = require("request-promise");
const express = require("express");
const app = express();
const region = "asia-southeast1";
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
const { SessionsClient } = require("@google-cloud/dialogflow");
const { get } = require("request");
const projectId = "chat-project-bef27";
//======================================================================================================================

//=========================================== handle event =============================================================
async function handleEvent(req, event) {
  switch (event.type) {
    case "message":
      switch (event.message.type) {
        case "text":
          addChatHistory(req, event);
          return;
      }
    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}
//============================================================================================================================

//===================== function detectIntent api dialogflow .=====================================
// async function detectIntentApi(req, event) {
//   const sessionClient = new dialogflow.SessionsClient({
//     projectId,
//     keyFilename: "chat-project-bef27-72a3467da386.json",
//   });
//   const userId = event.source.userId;
//   const userText = event.message.text;
//   const sessionPath = sessionClient.projectAgentSessionPath(projectId, userId);
//   console.log("1");
//   const request = {
//     session: sessionPath,
//     queryInput: {
//       text: {
//         text: userText,
//         languageCode: "th",
//       },
//     },
//   };
//   const response = await sessionClient.detectIntent(request).catch((err) => {
//     console.log("detectIntent:", err);
//     throw err;
//   });
//   return response[0];
// }
//======================================================================================================
//==================================== function add chat history in firebase firestore ===============================================
async function addChatHistory(req, event) {
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

//======================= cloud function with express  ====================================================
exports.api = functions.region(region).https.onRequest(app);
