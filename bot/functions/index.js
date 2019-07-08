const functions = require('firebase-functions');
const request = require('request-promise');
const line = require('@line/bot-sdk');
var mysql = require('mysql');
var sha1 = require('sha1')
const admin = require('firebase-admin')
admin.initializeApp({
    credential: admin.credential.applicationDefault()
})
var db = admin.firestore()
/*

const HOST_MYSQL = '35.197.139.54'
const PORT_MYSQL = '3306'
// connection configurations
var con = mysql.createConnection({
    host: HOST_MYSQL,
    port: PORT_MYSQL,
    user: 'root',
    password: 'root',
    database: 'line_bot_database'
});
// connect to database
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});
*/
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer gGtk93uADTRkWk4l4RF9mVuIzIhNodzgm0g0S2cxhlflDeUeraOEFt4n9AIK9hrEfV3+zVbCqilGzYJ24AOacXfNNVYZ9EK1q92rhKb9qvWkHxUtg29SzWCke3TQ5bxBi9GYcJCI6wAzu/Ez5RgXXgdB04t89/1O/w1cDnyilFU=`
};
const client = new line.Client({
    channelAccessToken: 'gGtk93uADTRkWk4l4RF9mVuIzIhNodzgm0g0S2cxhlflDeUeraOEFt4n9AIK9hrEfV3+zVbCqilGzYJ24AOacXfNNVYZ9EK1q92rhKb9qvWkHxUtg29SzWCke3TQ5bxBi9GYcJCI6wAzu/Ez5RgXXgdB04t89/1O/w1cDnyilFU='
});


//reply
exports.LineBot = functions.https.onRequest((req, res) => {
    const promises = req.body.events.map(event => {
        if (event.type === 'follow') {
            client.getProfile(event.source.userId).then((profile) => {
                const disname = profile.displayName;
                const uId = profile.userId;
                let newdisname = disname
                let newuserid = uId
                let data = db.collection('line_account_collection').add({
                    userId: newuserid,
                    displayName: newdisname,
                    userGroup: "",
                    userZone: ""
                }).then(function(docRef) {
                    console.log("Document written with ID: ", docRef.id);
                }).catch(function(error) {
                    console.error("Error adding document: ", error);
                });
                console.log(profile.displayName);
                console.log("disname :" + disname)
                console.log(profile.userId);
                console.log("uId :" + uId)
                console.log(profile.pictureUrl);
                console.log(profile.statusMessage);
                greet(req.body, disname);
                /*
		    con.query("INSERT INTO line_account SET ? ", {
                userId: uId,
                displayName: disname
            }, function(error, results, fields) {
            	console.log("inconnec")
                if (error) throw error;
                return res.send({
                    error: false,
                    data: results,
                    message: 'New user has been created successfully.'
                });

			  });
			  */
            }).catch((err) => {
                // error handling
            });
            return Promise.resolve()
        } else if (event.type === 'message') {
            reply(req.body);
            return Promise.resolve()
        } else if (event.type === 'unfollow') {
            console.log("this is unfollow")
            var deletedoc = db.collection('line_account_collection').where('userId', '==', event.source.userId);
            deletedoc.get().then(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    doc.ref.delete();
                });
            });
            return Promise.resolve()
        } else {
            console.log("unknow event")
            // other handling see the details in official docs
            // https://devdocs.line.me/ja/#webhook-event-object
            return Promise.resolve()
        }
    })
    Promise.all(promises).then(() => res.json({
        success: true
    }))
    /*
  if (req.body.events[0].message.type == 'text') {
  	reply(req.body);
    return;
  }
  else if (req.body.events[0].type == 'follow') {
  	reply2(req.body);
    return;
  }

  */
});
const reply = (bodyResponse) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: bodyResponse.events[0].replyToken,
            messages: [{
                type: `text`,
                text: "auto reply -- your userId : " + bodyResponse.events[0].source.userId
            }]
        })
    });
};
const greet = (bodyResponse, disname) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: bodyResponse.events[0].replyToken,
            messages: [{
                type: `text`,
                text: "สวัสดีคุณ " + disname + " ขอบคุณที่เพิ่มผมเป็นเพื่อนงับ"
            }]
        })
    });
};
// multicast
exports.LineBotMulticast = functions.https.onRequest((req, res) => {
    const text = req.body.text;
    if (text !== undefined && text.trim() !== ``) {
        const text2 = "sent from multicast function : " + text;
        const userlist = [];
        //userlist.push(`Uf5e1c89bc07914709dfa7f8f5bc2283f`, `U484bc9463f1490b0e53e35a96ddc602e`)
        let getuser = db.collection('line_account_collection');
        let query = getuser.get().then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                return;
            }
            snapshot.forEach(doc => {
                const thisuser = doc.data().userId;
                console.log("this is user :  " + thisuser);
                userlist.push(thisuser);
                console.log(doc.id, '=>', doc.data());
                console.log("this is userlist :  " + userlist);
            });
            return multicast(res, text2, userlist);
        }).catch(err => {
            console.log('Error getting documents', err);
        });
        
    } else {
        const ret = {
            message: 'Text not found'
        };
        return res.status(400).send(ret);
    }
});
const multicast = (res, msg, userlist) => {
    console.log("this is multicast user :  " + userlist);
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/multicast`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            to: userlist,
            messages: [{
                type: `text`,
                text: msg
            }]
        })
    }).then(() => {
        const ret = {
            message: 'Done'
        };
        return res.status(200).send(ret);
    }).catch((error) => {
        const ret = {
            message: `Sending error: ${error} ${userlist}`
        };
        return res.status(500).send(ret);
    });
}
//broad cast
exports.LineBotBroadcast = functions.https.onRequest((req, res) => {
    const text = req.body.text;
    if (text !== undefined && text.trim() !== ``) {
        textz = "sent from broadcast function : " + text
        return broadcast(res, textz);
    } else {
        const ret = {
            message: 'Text not found'
        };
        return res.status(400).send(ret);
    }
});
const broadcast = (res, msg) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/broadcast`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            messages: [{
                type: `text`,
                text: msg
            }]
        })
    }).then(() => {
        const ret = {
            message: 'Done'
        };
        return res.status(200).send(ret);
    }).catch((error) => {
        const ret = {
            message: `Sending error: ${error}`
        };
        return res.status(500).send(ret);
    });
}