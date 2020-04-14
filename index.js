const express = require('express');
const bodyParser = require('body-parser');
const js2xmlparser = require("js2xmlparser");
const morgan = require('morgan');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({ limit:'50mb',extended: true }));

app.use(morgan(":method :url :status :response-time[digits]ms",{
    stream: fs.createWriteStream('./access.log', {flags: 'a'})
}));

const covid19ImpactEstimator = (data) => {

    let impact = {};
    let severeImpact = {};
    let factor = 0;
    let days = 0;

    if(data.periodType === "months") {
        let monthsToDays = data.timeToElapse * 30;
        days = monthsToDays;

        factor = Math.floor(monthsToDays / 3);
    } else if(data.periodType === "weeks") {
        let weeksToDays = data.timeToElapse * 7;
        days = weeksToDays;

        factor = Math.floor(weeksToDays / 3);
    } else {
        days = data.timeToElapse;
        factor = Math.floor(data.timeToElapse / 3);
    }
  
    impact.currentlyInfected = data.reportedCases * 10;
    impact.infectionsByRequestedTime = impact.currentlyInfected * (2 ** factor);
    impact.severeCasesByRequestedTime = Math.floor(impact.infectionsByRequestedTime * 0.15);
    impact.hospitalBedsByRequestedTime = Math.floor((data.totalHospitalBeds * 0.35) - impact.severeCasesByRequestedTime);
    impact.casesForICUByRequestedTime = Math.floor(impact.infectionsByRequestedTime * 0.05);
    impact.casesForVentilatorsByRequestedTime = Math.floor(impact.infectionsByRequestedTime * 0.02);
    impact.dollarsInFlight = Math.floor((impact.infectionsByRequestedTime * data.region.avgDailyIncomeInUSD * data.region.avgDailyIncomePopulation) / days);
  
    severeImpact.currentlyInfected = data.reportedCases * 50;
    severeImpact.infectionsByRequestedTime = severeImpact.currentlyInfected * (2 ** factor);
    severeImpact.severeCasesByRequestedTime = Math.floor(severeImpact.infectionsByRequestedTime * 0.15);
    severeImpact.hospitalBedsByRequestedTime = Math.floor((data.totalHospitalBeds * 0.35) - severeImpact.severeCasesByRequestedTime);
    severeImpact.casesForICUByRequestedTime = Math.floor(severeImpact.infectionsByRequestedTime * 0.05);
    severeImpact.casesForVentilatorsByRequestedTime = Math.floor(severeImpact.infectionsByRequestedTime * 0.02);
    severeImpact.dollarsInFlight = Math.floor((severeImpact.infectionsByRequestedTime * data.region.avgDailyIncomeInUSD * data.region.avgDailyIncomePopulation) / days);
  
    return {data, impact, severeImpact};
};

let output = {};

app.get('/', (req, res) => res.send('Hello World!'));

app.post('/api/v1/on-covid-19', (req, res) => {
    let data = req.body;
    
    output = covid19ImpactEstimator(data);

    

    return res.json(output);
});

app.get('/api/v1/on-covid-19/:res_format', (req, res) => {
    let responseFormat = req.params.res_format;

    if(responseFormat === "xml") {
        res.set('Content-Type', 'application/xml');
        res.send(js2xmlparser.parse("output",output));
    } else if (responseFormat === "logs") {
        fs.readFile("access.log", function(err, buf) {
            res.set('Content-Type', 'application/text');
            res.send(buf.toString());
        });
        
    } else {
        res.json(output);   
    }

    return res;
});

app.listen(port, () => console.log(`On Covid 19 app listening at http://localhost:${port}`));