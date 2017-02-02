require('newrelic');

/* eslint-env node */
'use strict';

const express = require('express');
const kue = require('kue')
const webpush = require('web-push');

const basicAuth = require('basic-auth-connect');
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
    TTL: 360 * 24 * 3600
  };

  const {event, subscription} = job.data;

  console.log(job);

  webpush.sendNotification(subscription, JSON.stringify(event), options).then(() => {
    done();
  }).catch((err) => {
    done(new Error(err));
  });
});

app.use(cors());
app.use(bodyParser.json());
app.use('/kue', basicAuth(process.env.KUE_USERNAME, process.env.KUE_PASSWORD), kue.app);

app.post('/api/v1/remind-me', (req, res) => {
  const {before, event, subscription} = req.body;
  const millisDifference = event.date - new Date().getTime();
  const timeValue = Math.max(0, before.timeValue);

  console.log(req.body);

  if (millisDifference < 0) {
    res.send(400);
  } else {
    let notificationTime;
    switch (before.timeUnit) {
      case 'month': notificationTime = millisDifference - timeValue * (30 * 24 * 60 * 60 * 1000); break;
      case 'week': notificationTime = millisDifference - timeValue * (7 * 24 * 60 * 60 * 1000); break;
      case 'day': notificationTime = millisDifference - timeValue * (24 * 60 * 60 * 1000); break;
      case 'hour': notificationTime = millisDifference - timeValue * (60 * 60 * 1000); break;
      case 'minute': notificationTime = millisDifference - timeValue * (60 * 1000); break;
      case 'second': notificationTime = millisDifference - timeValue * (1000); break;
      default: notificationTime = millisDifference;
    }
    const delay = Math.max(notificationTime, 0);

    jobQueue.create('reminder', { event, subscription, title: new Date(event.date).toString() })
      .removeOnComplete(true)
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
