'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
const initSqlJs = require('sql.js');
var fs = require('fs');
var filebuffer = fs.readFileSync('../../usaFactsCovid.db');

// get date range helper
function getDateRange(start, end) {
  const startString = `${start-100}`;
  const endString = `${end-100}`;
  const currDate = new Date(startString.slice(0,4), startString.slice(4,6), startString.slice(6,8));
  const endDate = new Date(endString.slice(0,4), endString.slice(4,6), endString.slice(6,8));
  var dateArray = [];
  while (currDate < endDate) {
    dateArray.push(currDate.toISOString().slice(0,10));
    currDate.setDate(currDate.getDate() + 1);
  }
  return dateArray.join('","')
}

const tableTree = {
  "confirmed": {
    "usafacts":{
      "county":"cases",
      "state":"usaFactsCasesCounty"
    }
  },
  "deaths": {
    "usafacts":{
      "county":"deaths",
      "state":"usaFactsCasesCounty"
    }
  }
}

const router = express.Router();
router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello from Express.js!</h1>');
  res.end();
});

router.get('/api', async (req, res) => {
  res.json({ test: 'test' })
});

router.post('/', (req, res) => res.json({ postBody: req.body }));

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

router.get('/v1/lisa/', async (req, res) => {
  // destructure parameters from URL query
  const {state,category,start,end,source,type,level} = req.query
  
  initSqlJs().then(function(SQL){
    // Load the db
    var db = new SQL.Database(filebuffer);
    // Prepare an sql statement
    
    // get a list of date columns to pull from
    const dateRange = getDateRange(start, end)
    
    if (category === "data") {  // Call for Raw Data
      const columnList = `countyFIPS,"County Name",State,StateFIPS,"${dateRange}"`
      
      // table name
      const table = tableTree[type||"confirmed"][source||"usafacts"][level||"county"]

      // construct SQL query
      const sql = `SELECT ${columnList} FROM ${table} WHERE State = '${state}'`;
      var stmt = db.prepare(sql);
      var result = [];
      while(stmt.step()) { //
        result.push(stmt.getAsObject())
      }
      // return results
      res.json(result);
    } else { // Call for getting lisa data
      res.json('na')
    }
  });
});

module.exports = app;
module.exports.handler = serverless(app);