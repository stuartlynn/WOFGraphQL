var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var app = express();
const stateNames = require('./stateNames')
//const censusFields  = require('./censusFields")
const { obsQuery, getStateVariables , fetchState, fetchCounty, fetchCounties}  = require('./obsHelper')

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




getStateVariables().then( (result)=>{

	console.log("Have state variables", result)
	
	const CountyType = new GraphQLObjectType({
		name: 'County',
		description:'A County in the USA',
		fields:()=>(result)
	})


	var fields  = Object.assign(result, {

			counties:{
				type: new GraphQLList(CountyType),
				description: "Counties within a state",
				resolve:(obj, args)=> fetchCounties(obj)
			}

	})

	console.log(fields)

	const StateType = new GraphQLObjectType({
		name: 'State',
		description:'A State in the USA',
		fields:()=>(fields)
	})



	const CountyField ={
		type: CountyType,
		args:{
			id: {type: new GraphQLNonNull(GraphQLID)},
			name: {type: GraphQLString},
		},
		resolve: (root,args,context) => {
			return fetchCounty(args["id"])
		}
	}

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
					id: {type: GraphQLInt},
					name: {type: GraphQLString},
					lat: {type: GraphQLFloat},
					lng: {type: GraphQLFloat},
				},
				resolve: (root,args,context) => {
					return fetchState(args)
				},
			},
			county: CountyField
		})
	})

	app.use('/graphql', graphqlHTTP({
		schema: new GraphQLSchema({ 
			query: QueryType,
			state: StateType
		}),
		graphiql: true
	}));
	
})


app.listen(4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');

