'use strict';

var _graphql = require('graphql');

require('dotenv').config();

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

var _require3 = require('./wofHelper'),
    fetchWOF = _require3.fetchWOF,
    WOFFields = _require3.WOFFields,
    constructWOFTypesAndFields = _require3.constructWOFTypesAndFields,
    WOFCommonArgs = _require3.WOFCommonArgs;

Promise.all([getStateVariables(), constructWOFTypesAndFields()]).catch(function (error) {
	return console.log('ALL PROMISE ERROR', error);
}).then(function (result) {

	var WOFTypes = result[1].types;
	var WOFFields = result[1].fields;

	var CountyType = new _graphql.GraphQLObjectType({
		name: 'County',
		description: 'A County in the USA',
		fields: function fields() {
			return result[0];
		}
	});

	var _fields = Object.assign({}, result[0], {
		counties: {
			type: new _graphql.GraphQLList(CountyType),
			description: "Counties within a state",
			resolve: function resolve(obj, args) {
				return fetchCounties(obj);
			}
		}
	});

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

	var DOFields = {
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

	var QueryType = new _graphql.GraphQLObjectType({
		name: 'Query',
		description: 'The root of everything',
		fields: function fields() {
			return Object.assign(DOFields, WOFFields);
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