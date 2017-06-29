/**
 * Created by benveen on 6/21/17.
 */

'use strict';

const express = require('express');
const bodyparser = require('body-parser');
const morgan = require('morgan');
const pouchdb = require('pouchdb');

let app = express();
app.use(morgan('combined'));
app.use(bodyparser.json());

/**
 * Need to figure out how to reinitialize couchdb connection on server restart.
 * This is just temporary until a better solution can be found.
 *
 */



let processLog = (logobject) => {
  return hawkeyedb.get('applications').then((doc) => {
    let applicationExists = false;
    let applicationName;
    doc.applications.some((app) => {
      if(app.application_token === logobject.token){
        applicationName = app.application_name;
        applicationExists = true;
        return true;
      }
    });
    if(!applicationExists)
      return {
        'statuscode': 500,
        'msg': 'The application is not configured in your Hawkeye server. Please configure and try again'
      };
    else {
      let doc_id = applicationName + ":" + logobject.timestamp.split('T')[0];
      return hawkeyedb.get(doc_id).then((logdoc) => {
        let new_log = {
          'loglevel': logobject.loglevel,
          'timestamp': logobject.timestamp,
          'message': logobject.message
        };
        logdoc.logs.unshift(new_log);
        return hawkeyedb.put(logdoc).then((result) => {
          return {
            'statuscode': 200,
            'msg': 'Successfully logged message'
          };
        }).catch((error) => {
          return {
            'statuscode': 500,
            'msg': 'Error writing log to Hawkeye database'
          };
        });
      }).catch((error) => {
        if(error.error === 'not_found'){
          let new_doc = {
            '_id': doc_id,
            'logs': []
          };
          let new_log = {
            'loglevel': logobject.loglevel,
            'timestamp': logobject.timestamp,
            'message': logobject.message
          };
          new_doc.logs.unshift(new_log);
          return hawkeyedb.put(new_doc).then((result) => {
            return {
              'statuscode': 200,
              'msg': 'Created new log doc for today, successfully logged message'
            };
          })
        } else {
          return {
            'statuscode': 500,
            'msg': error.error
          };
        }
      });
    }
  }).catch((error) => {
    console.log(error);
  })
};


app.route('/log')
  .post((request, response) => {
    processLog(request.body).then((result) => {
      response.status(result.statuscode).send(result.msg);
    }).catch((error) => {
      response.status(500).send(error);
    });
}).get((request, response) => {
  response.send('404');
});

app.route('/setup')


app.listen(3001, () => {
  console.log('listening on port 3001');
});