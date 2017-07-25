require('dotenv').config()

var express = require('express');
var graphqlHTTP = require('express-graphql');
var { buildSchema } = require('graphql');
var app = express();


const stateNames = require('./stateNames')
//const censusFields  = require('./censusFields")
const { obsQuery, getStateVariables , fetchState, fetchCounty, fetchCounties}  = require('./obsHelper')
const { fetchWOF, WOFFields, constructWOFTypesAndFields, WOFCommonArgs}  = require('./wofHelper')

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


Promise.all([getStateVariables(), constructWOFTypesAndFields()])
			  .catch( (error)  => console.log('ALL PROMISE ERROR', error) )
				.then(  (result) => {


	const WOFTypes  = result[1].types
	const WOFFields = result[1].fields
	
	const CountyType = new GraphQLObjectType({
		name: 'County',
		description:'A County in the USA',
		fields:()=>(result[0])
	})


	var fields  = Object.assign({},result[0], {
		counties:{
			type: new GraphQLList(CountyType),
			description: "Counties within a state",
			resolve:(obj, args)=> fetchCounties(obj)
		}
	})


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


	const DOFields = {
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
	}


	const QueryType = new GraphQLObjectType({
		name: 'Query',
		description:'The root of everything',
		fields: ()=>(
			Object.assign(DOFields, WOFFields)
		)
	})

	app.use('/graphql', graphqlHTTP({
		schema: new GraphQLSchema({ 
			query: QueryType,
			state: StateType
		}),
		graphiql: true
	}));
	
})


app.listen(process.env.PORT || 4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');

