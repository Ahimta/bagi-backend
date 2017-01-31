/* eslint-env node */
'use strict';

const express = require('express');
const webpush = require('web-push');

const bodyParser = require('body-parser');
const cors = require('cors')

const PUBLIC_KEY = 'BBxrA4lbAkt1TiViiJAgeysBQ8Mg7G9URWLDnpe2rfSfFYV26RH7SUWKc0ouHkbw6lGu9dDM4nmiuG05JTbzVqs';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post('/send-push-msg', (req, res) => {
  const options = {
    vapidDetails: {
      subject: 'https://ahimta.github.io/bagi/',
      publicKey: PUBLIC_KEY,
      privateKey: PRIVATE_KEY
    },
    TTL: 3600
  };

  console.log(req.body);

  webpush.sendNotification(req.body.subscription, req.body.data, options).then(() => {
    res.status(200).send({ success: true });
  }).catch((err) => {
    if (err.statusCode) {
      res.status(err.statusCode).send(err.body);
    } else {
      res.status(400).send(err.message);
    }
  });
});

const server = app.listen(process.env.PORT || '8080', () => {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
