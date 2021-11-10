const functions = require("firebase-functions");
const line = require("@line/bot-sdk");
const express = require("express");
const region = "asia-southeast1";
const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer WK6gkQSIcedlwVVquJkAR3BnQTEUvWfLXRvAqOPBBSt0mvX7+b4cu2Q+wg4sn2XjVPtwlCkmqAWAIua1HyZSdj1k/Xpozurpdw+jMHN3aW41iEEcCJE2/SFNsmoVwbrv1CoBihfCjypx0ZYT66VusgdB04t89/1O/w1cDnyilFU=`
};

const admin = require("firebase-admin");
const { request } = require("express");
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const app = express();

async function handleEvent(req,event){
    switch(event.type){
        case 'message':
            switch(event.message.type){
                case 'text':
                    return addChatHistory(req,event);
            }
        default: throw new Error(`Unknown event: ${JSON.stringify(event)}`)
    }   
}

function addChatHistory(req,event){
    const userId = event.source.userId
    const timestamp = event.timestamp
    const userText = event.message.text
    const addchatHis = db.collection("chat-history").doc().set({
        "userId": userId,
        "Message": userText,
        "timestamp": timestamp
    })
    .catch((err)=>{
        console.log(err)
    })
}

app.post("/webhook", line.middleware(config), async (req, res) => {
    Promise
    .all(req.body.events.map(event=>{
        return handleEvent(req,event);
    }))
    res.status(200).end();
});

exports.api = functions.region(region).https.onRequest(app);
