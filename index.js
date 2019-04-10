const functions = require('firebase-functions');
const admin = require('firebase-admin');

const cors = require('cors')({ origin: true });
const fetch = require('node-fetch');
const qs = require('qs');
const uuid = require('uuid/v3');

// firebase service account json file. added the google recaptcha secret to it for convienience
const privateConfig = require('./private.json');

const DOMAIN_NAME = 'cecysgap.com';
const ORDER_ENDPOINT = 'https://cecysgapwebapp.firebaseio.com/orders.json';

const RECAPTCHA_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Initialize admin
 */
admin.initializeApp({
  credential: admin.credential.cert(privateConfig),
  databaseURL: 'https://cecysgapwebapp.firebaseio.com/'
});
 
/**
 * HTTP end point for fetching orders for customer app
 */

/**
 * HTTP end point to process order submissions from customer app
 */
exports.orderSubmit = functions.https.onRequest((request, response) => {
  return cors(request, response, () => {
    if (request.method !== 'POST') {
      return response.status(403).json({ message: 'Method Not Allowed' });
    }
    
    // docs wise this should already be parsed to JS. but it's not here
    let data = JSON.parse(request.body);
    
    // clean request data
    const textRe = /[^A-Za-z0-9\s.-]/;
    const orderData = {
      uid: uuid(DOMAIN_NAME, uuid.DNS),
      timestamp: Date.now(),
      name: data.name.replace(textRe, ''),
      number: data.number.replace(textRe, ''), // not gonna bother validating actual number format. as long as the text is safe
      details: data.details.replace(textRe, ''),
      status: 1 // placed
    };
    
    // verify recaptcha
    const postData = {
      secret: privateConfig.recaptcha_secret,
      response: data.token
    };
    fetch(RECAPTCHA_ENDPOINT, {
      method: 'post',
      body:    qs.stringify(postData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(res => res.json())
    .then(json => {
      console.log('ReCaptcha Result', json);
      if (json.success) {
        // save order to database
        // return fetch(ORDER_ENDPOINT, {
        //   method: 'post',
        //   body:    JSON.stringify(orderData),
        //   headers: { 'Content-Type': 'application/json' }
        // });
        return admin.database().ref('orders').push(orderData);
      } else {
        return Promise.reject(new Error('Recaptcha Unsuccessful'));
      }
    })
    .then(res => response.status(201).json(orderData))
    .catch(err => {
      console.error(err);
      response.status(500).json({ message: err.message });
    });
  });
});

// exports.onFileChange = functions.storage.object().onChange(event => {
//     console.log(event);
//     return;
// });