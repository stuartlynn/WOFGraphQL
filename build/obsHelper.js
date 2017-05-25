'use strict';

var _graphql = require('graphql');

var fetch = require('node-fetch');
var fs = require('fs');
var stateNames = require('./stateNames');

var stateTables = {
  geomTable: 'obs_9812b21f90f3e6a885dc546a3c6ad32e0190d723',
  valTable: 'obs_79ba0a30fc279814eeff6e7813027b444fa09d6b'
};

var countyTables = {
  geomTable: 'obs_23cb5063486bd7cf36f17e89e5e65cd31b331f6e',
  valTable: 'obs_c73f24f944b4261938f54247f871ec3d140e6804'
};

var fetchState = function fetchState(finder) {
  if (finder.id) {
    return obsQuery('select  * from ' + stateTables.valTable + ' where geoid::NUMERIC=' + finder.id + ' ').then(function (res) {
      return res.rows[0];
    });
  } else if (finder.name) {
    return obsQuery('select  * from ' + stateTables.valTable + ' where geoid::NUMERIC=' + stateNames[finder.name] + ' ').then(function (res) {
      return res.rows[0];
    });
  } else if (finder.lat && finder.lng) {
    return obsQuery('select v.* from ' + stateTables.valTable + ' as v, ' + stateTables.geomTable + ' as g where ST_WITHIN(CDB_LATLNG(' + finder.lat + ', ' + finder.lng + '),g.the_geom) and g.geoid=v.geoid').then(function (res) {
      return res.rows[0];
    });
  }
};

var toDash = function toDash(name) {
  return name.replace(/([A-Z])/g, function (a) {
    return "_" + a.toLowerCase();
  });
};
var toCC = function toCC(name) {
  return name.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
};

var colToField = function colToField(col) {
  return {
    description: col,
    type: _graphql.GraphQLFloat,
    resolve: function resolve(obj) {
      return obj[toDash(col)];
    }
  };
};

var fetchCounty = function fetchCounty(county_name) {
  return obsQuery('select  * from ' + countyTables.valTable + ' where geoid::NUMERIC=' + county_name + ' ').then(function (res) {
    return res.rows[0];
  });
};

var fetchCounties = function fetchCounties(obj) {
  return obsQuery('select * from ' + countyTables.valTable + ' where geoid ilike \'' + obj.geoid + '%\' ').then(function (r) {
    console.log(r);return r;
  }).then(function (res) {
    return res.rows;
  });
};

var obsQuery = function obsQuery(query) {
  console.log('running query');
  console.log(query);
  var format = 'json';
  var cleanQuery = encodeURIComponent(query);
  var url = 'https://observatory.carto.com/api/v2/sql?q=' + cleanQuery + '&format=' + format;

  var result = fetch(url).then(function (res) {
    return res.json();
  });
  return result;
};

var getStateVariables = function getStateVariables() {
  return obsQuery('select * from ' + stateTables.valTable + ' limit 1').then(function (r) {
    return Object.keys(r.rows[0]);
  }).then(function (keys) {
    var fields = {};
    keys.forEach(function (key) {
      fields[toCC(key)] = colToField(toCC(key));
    });
    return fields;
  });
};

module.exports = { obsQuery: obsQuery, getStateVariables: getStateVariables, stateTables: stateTables, countyTables: countyTables, fetchState: fetchState, fetchCounties: fetchCounties, fetchCounty: fetchCounty };