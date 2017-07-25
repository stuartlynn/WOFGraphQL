var fetch = require('node-fetch')
var fs = require('fs')
const stateNames = require('./stateNames')

import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat
} from 'graphql';

const stateTables={
  geomTable : 'obs_9812b21f90f3e6a885dc546a3c6ad32e0190d723',
  valTable  : 'obs_79ba0a30fc279814eeff6e7813027b444fa09d6b'
}

const countyTables={
  geomTable : 'obs_23cb5063486bd7cf36f17e89e5e65cd31b331f6e',
  valTable  : 'obs_c73f24f944b4261938f54247f871ec3d140e6804'
}


var fetchState = (finder)=>{
  if (finder.id){
    return obsQuery(`select  * from ${stateTables.valTable} where geoid::NUMERIC=${finder.id} `).then((res)=>res.rows[0])
  }
  else if (finder.name){
    return obsQuery(`select  * from ${stateTables.valTable} where geoid::NUMERIC=${stateNames[finder.name]} `).then((res)=>res.rows[0])
  }
  else if(finder.lat && finder.lng){
    return obsQuery(`select v.* from ${stateTables.valTable} as v, ${stateTables.geomTable} as g where ST_WITHIN(CDB_LATLNG(${finder.lat}, ${finder.lng}),g.the_geom) and g.geoid=v.geoid`).then((res)=>res.rows[0])
  }

}

const toDash= (name)=> name.replace(/([A-Z])/g,(a)=>("_"+a.toLowerCase()))
const toCC =  (name)=> name.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });


const colToField= (col)=>{
  return {
    description: col, 
    type: GraphQLFloat, 
    resolve: (obj)=>obj[toDash(col)]
  }
}

var fetchCounty = (county_name)=>{
  return obsQuery(`select  * from ${countyTables.valTable} where geoid::NUMERIC=${county_name} `)
  .then((res)=>res.rows[0])
}

var fetchCounties = (obj)=>{
  return obsQuery(`select * from ${countyTables.valTable} where geoid ilike '${obj.geoid}\%' `).then((r)=> {console.log(r); return r}).
then((res)=> res.rows)
}


const obsQuery=(query)=>{
  var format = 'json' 
  var cleanQuery = encodeURIComponent(query)
  var url = `https://observatory.carto.com/api/v2/sql?q=${cleanQuery}&format=${format}`
  
  var result = fetch(url)
               .then((res)=> res.json())
  return result
}
  
const getStateVariables=()=>{
  return obsQuery(`select * from ${stateTables.valTable} limit 1`)
  .then((r)=> Object.keys(r.rows[0]))
  .then((keys) => {
    var fields ={}
    keys.forEach( (key)=>{
      fields[toCC(key)] = colToField(toCC(key))
    })
    return fields;
  })
}


module.exports= { obsQuery, getStateVariables, stateTables, countyTables, fetchState, fetchCounties,fetchCounty }
