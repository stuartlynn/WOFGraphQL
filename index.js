var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var fetch = require('node-fetch');


import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt
} from 'graphql';


const stateTables={
  geomTable : 'obs_9812b21f90f3e6a885dc546a3c6ad32e0190d723',
  valTable  : 'obs_79ba0a30fc279814eeff6e7813027b444fa09d6b'
}

const countyTables={
  geomTable : 'obs_23cb5063486bd7cf36f17e89e5e65cd31b331f6e',
  valTable  : 'obs_c73f24f944b4261938f54247f871ec3d140e6804'
}

var obsQuery=(query)=>{
  console.log("query is ", query)
  var format = 'json' 
  var url = `https://observatory.carto.com/api/v2/sql?q=${query}&format=${format}`
  console.log('url is', url)
  var result = fetch(url)
               .then((res)=> res.json())
               .then((res)=>res.rows[0])
               //.then((res)=>console.log(res))
  return result
}


var fetchState = (state_name)=>{
  console.log("trying to grab a state",state_name)
  return obsQuery(`select  * from ${stateTables.valTable} where geoid::NUMERIC=${state_name} `)
}


var fetchCounty = (state_name)=>{
  console.log("trying to grab a county",county_name)
  return obsQuery(`select  * from ${valTable} where geoid::NUMERIC=${state_name} `)
}

const StateType = new GraphQLObjectType({
	name: 'State',
	description:'A State in the USA',
	fields:()=>({
		name: {
			type:GraphQLString,
			description:"Name of a state"
		},
		geoid: {
			type:GraphQLString,
			description:"Geoid from the US census"
		},
		totalPop:{
			type:GraphQLInt,
			description:"The total population of this region",
			resolve: obj => obj.total_pop
		}

	})
})


const CountyType = new GraphQLObjectType({
	name: 'County',
	description:'A County in the USA',
	fields:()=>({
		name: {
			type:GraphQLString,
			description:"Name of a state"
		},
		geoid: {
			type:GraphQLString,
			description:"Geoid from the US census"
		},
		totalPop:{
			type:GraphQLInt,
			description:"The total population of this region",
			resolve: obj => obj.total_pop
		}
	})
})

const QueryType = new GraphQLObjectType({
	name: 'Query',
	description:'The root of everything',
	fields: ()=>({
		allStates:{
			type: new GraphQLList(StateType),
			description: "All the states in the US"
		},
		state:{
			type: StateType,
			args:{
				id: {type: new GraphQLNonNull(GraphQLID)},
				name: {type: GraphQLString},
			},
      resolve: (root,args,context) => {
        return fetchState(args["id"])
      },
		},

    county:{
			type: CountyType,
			args:{
				id: {type: new GraphQLNonNull(GraphQLID)},
				name: {type: GraphQLString},
			},
      resolve: (root,args,context) => {
        return fetchCounty(args["id"])
      },
		}
	})
})


// The root provides a resolver function for each API endpoint
var root = {
  hello: () => 'Hello world!',
  goodbye: () => 'See you'
};

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: new GraphQLSchema({ 
		query: QueryType,
		state: StateType
	}),
  graphiql: true
}));
app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');

