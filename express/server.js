'use strict';
const express = require('express');
const serverless = require('serverless-http');
const app = express();
// const jsgeoda = require('jsgeoda');
const sqlite3 = require("sqlite3").verbose();

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
// connect to db
const db = new sqlite3.Database('./usaFactsCovid.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database");
});

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

// make sqlite function like postgres
db.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
      that.all(sql, params, function (error, rows) {
      if (error)
          reject(error);
      else
          resolve({ rows: rows });
      });
  });
};

const router = express.Router();

router.get('/', async (req, res) => {
  var sql = `SELECT * FROM cases LIMIT 5`;
  var result = await db.query(sql, []);
  res.json({
          "message":"success",
          "data": result.rows
  });
});

router.get('/v1/lisa/', async (req, res) => {
  // destructure parameters from URL query
  const {state,category,start,end,source,type,level} = req.query
  
  // get a list of date columns to pull from
  const dateRange = getDateRange(start, end)
  if (category === "data") {  // Call for Raw Data
    const columnList = `countyFIPS,"County Name",State,StateFIPS,"${dateRange}"`
    
    // table name
    const table = tableTree[type||"confirmed"][source||"usafacts"][level||"county"]

    // construct SQL query
    var sql = `SELECT ${columnList} FROM ${table} WHERE State = '${state}'`;

    // query and await results
    var result = await db.query(sql, []);

    // return results
    res.json(result.rows);
  } else { // Call for getting lisa data
    res.json('na')
  }
});

app.use('/.netlify/functions/server', router);  // path must route to lambda
// app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
