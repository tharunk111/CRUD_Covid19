const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

let db = null;
let dbpath = path.join(__dirname, "covid19India.db");

const initializeDB = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started listening at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
  }
};

initializeDB();

function statesInRequiredFormat(obj) {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
}

const districtInRequiredFormat = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

//GET all states from state table
app.get("/states/", async (request, response) => {
  let allStatesQuery = `select * from state;`;
  let getResponse = await db.all(allStatesQuery);
  response.send(
    getResponse.map((eachState) => statesInRequiredFormat(eachState))
  );
});

//GET state details from state table with id specified.
app.get("/states/:stateId", async (request, response) => {
  let { stateId } = request.params;
  let singleStateQuery = `select * from state where state_id = ${stateId};`;
  stateResponse = await db.get(singleStateQuery);
  response.send(statesInRequiredFormat(stateResponse));
});

//POST a district into district table (body and content-type will be specified in request)
app.post("/districts/", async (request, response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let postDistrictQuery = `INSERT INTO district(district_name, state_id, cases, cured, active,deaths)
    VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active},${deaths});`;
  let postResponse = await db.run(postDistrictQuery);
  let districtId = postResponse.lastId;
  response.send("District Successfully Added");
});

//GET district from district table matching the id specified by path parameter.
app.get("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let getDistrictQuery = `select * from district where district_id = ${districtId};`;
  let getResponse = await db.get(getDistrictQuery);
  response.send(districtInRequiredFormat(getResponse));
});

//DELETE a row from district specified by districtId
app.delete("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  deleteQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

//UPDATE details of a district by using request body and path parameter.
app.put("/districts/:districtId/", async (request, response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let { districtId } = request.params;
  putQuery = `UPDATE district SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};
    `;
  await db.run(putQuery);
  response.send("District Details Updated");
});

function returnStats(obj) {
  return {
    totalCases: obj.totalCases,
    totalCured: obj.totalCured,
    totalActive: obj.totalActive,
    totalDeaths: obj.totalDeaths,
  };
}

//stats of covid19 of a state specified by path parameter.

app.get("/states/:stateId/stats/", async (request, response) => {
  let { stateId } = request.params;
  let statsQuery = `select SUM(cases) AS "totalCases", SUM(cured) AS "totalCured", 
    SUM (active) AS "totalActive", SUM(deaths) AS "totalDeaths" from district
    GROUP BY state_id HAVING state_id = ${stateId};`;
  let statsResponse = await db.get(statsQuery);
  response.send(returnStats(statsResponse));
});

function returnStateName(obj) {
  return {
    stateName: obj.state_name,
  };
}

//return obj having state name of a district based on districtId

app.get("/districts/:districtId/details/", async (request, response) => {
  //let { districtId } = request.params;
  let districtId = 2;
  let stateNameQuery = `select state_name from state s inner join district d 
  on s.state_id = d.state_id where district_id = ${districtId};`;
  let stateResponse = await db.get(stateNameQuery);
  response.send(returnStateName(stateResponse));
});

module.exports = app;
