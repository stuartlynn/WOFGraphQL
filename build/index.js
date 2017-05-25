'use strict';

var _graphql = require('graphql');

var express = require('express');
var graphqlHTTP = require('express-graphql');

var _require = require('graphql'),
    buildSchema = _require.buildSchema;

var app = express();
var stateNames = require('./stateNames');
//const censusFields  = require('./censusFields")

var _require2 = require('./obsHelper'),
    obsQuery = _require2.obsQuery,
    getStateVariables = _require2.getStateVariables,
    fetchState = _require2.fetchState,
    fetchCounty = _require2.fetchCounty,
    fetchCounties = _require2.fetchCounties;

getStateVariables().then(function (result) {

	console.log("Have state variables", result);

	var CountyType = new _graphql.GraphQLObjectType({
		name: 'County',
		description: 'A County in the USA',
		fields: function fields() {
			return result;
		}
	});

	var _fields = Object.assign(result, {

		counties: {
			type: new _graphql.GraphQLList(CountyType),
			description: "Counties within a state",
			resolve: function resolve(obj, args) {
				return fetchCounties(obj);
			}
		}

	});

	console.log(_fields);

	var StateType = new _graphql.GraphQLObjectType({
		name: 'State',
		description: 'A State in the USA',
		fields: function fields() {
			return _fields;
		}
	});

	var CountyField = {
		type: CountyType,
		args: {
			id: { type: new _graphql.GraphQLNonNull(_graphql.GraphQLID) },
			name: { type: _graphql.GraphQLString }
		},
		resolve: function resolve(root, args, context) {
			return fetchCounty(args["id"]);
		}
	};

	var QueryType = new _graphql.GraphQLObjectType({
		name: 'Query',
		description: 'The root of everything',
		fields: function fields() {
			return {
				allStates: {
					type: new _graphql.GraphQLList(StateType),
					description: "All the states in the US"
				},
				state: {
					type: StateType,
					args: {
						id: { type: _graphql.GraphQLInt },
						name: { type: _graphql.GraphQLString },
						lat: { type: _graphql.GraphQLFloat },
						lng: { type: _graphql.GraphQLFloat }
					},
					resolve: function resolve(root, args, context) {
						return fetchState(args);
					}
				},
				county: CountyField
			};
		}
	});

	app.use('/graphql', graphqlHTTP({
		schema: new _graphql.GraphQLSchema({
			query: QueryType,
			state: StateType
		}),
		graphiql: true
	}));
});

app.listen(process.env.PORT || 4000);
console.log('Running a GraphQL API server at localhost:4000/graphql');