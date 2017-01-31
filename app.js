/* eslint-env node */
'use strict';

const express = require('express');
const kue = require('kue')
const webpush = require('web-push');

const bodyParser = require('body-parser');
const cors = require('cors')

const PUBLIC_KEY = 'BBxrA4lbAkt1TiViiJAgeysBQ8Mg7G9URWLDnpe2rfSfFYV26RH7SUWKc0ouHkbw6lGu9dDM4nmiuG05JTbzVqs';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const app = express();
const jobQueue = kue.createQueue({ redis: process.env.REDIS_URL });

jobQueue.process('reminder', (job, done) => {
  const options = {
    vapidDetails: {
      subject: 'https://ahimta.github.io/bagi/',
      publicKey: PUBLIC_KEY,
      privateKey: PRIVATE_KEY
    },
    TTL: 3600
  };

  const {before, event: eventString, subscription} = job.data;
  const event = eventString ? JSON.stringify(eventString) : JSON.stringify({});

  console.log(job);

  webpush.sendNotification(subscription, event, options).then(() => {
    done();
  }).catch((err) => {
    done(new Error(err));
  });
})

app.use(cors());
app.use(bodyParser.json());
app.use('/kue', kue.app);

app.post('/send-push-msg', (req, res) => {
  const {before, event, subscription} = req.body;
  const millisDifference = event.date - new Date().getTime();

  console.log(req.body);

  if (millisDifference < 0) {
    res.send(400);
  } else {
    let notificationTime;
    switch (before) {
      case 'month': notificationTime = event.date - (30 * 24 * 60 * 60 * 1000); break;
      case 'week': notificationTime = event.date - (7 * 24 * 60 * 60 * 1000); break;
      case 'day': notificationTime = event.date - (24 * 60 * 60 * 1000); break;
      case 'hour': notificationTime = event.date - (60 * 60 * 1000); break;
      case 'minute': notificationTime = event.date - (60 * 1000); break;
      case 'second': notificationTime = event.date - (1000); break;
      default: notificationTime = event.date;
    }
    const delay = Math.max(new Date(), new Date(notificationTime))

    jobQueue.create('reminder', { before, event, subscription, title: new Date(event.date).toString() })
      .delay(delay)
      .save(err => {
        if (err) {
          console.log('Couldn\' enqueue reminder: ', req.body);
          res.send(500, err);
        } else {
          res.send(req.body);
        }
      });
  }
});

const server = app.listen(process.env.PORT || '8080', () => {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
