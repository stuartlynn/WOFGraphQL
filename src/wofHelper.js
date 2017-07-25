var fetch = require('node-fetch')
var fs = require('fs')

import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
	GraphQLScalarType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat
} from 'graphql';

const MapZenBaseURL = 'https://whosonfirst-api.mapzen.com' 
const MapZenAPIKEY  = process.env.mapzen_api_key


// Probably want to fix this at some point
var childrenLookup = {}
var types  = {};
var fields = {};

var GeoJSON = new GraphQLScalarType({
    name: 'GeoJSON',
    serialize: (value) => {
        // console.log('serialize value', value);
        return value;
    },
    parseValue: (value) => {
        // console.log('parseValue value', value);
        return value;
    },
    parseLiteral: (ast) => {
        // console.log('parseLiteral ast', ast);
        return ast.value;
    }
});

const WOFFields = {
  'wof_id': { 
    description: 'Who\'s on first ID',
    type: GraphQLInt, 
    resolve: (obj) => obj['wof:id']
  },
  'wof_parent_id': { 
    description: 'Who\'s on parent ID',
    type: GraphQLString,
    resolve: (obj) => obj['wof:parent_id']
  },
  'wof_name': {
    description: 'Who\'s on first name',
    type: GraphQLString,
    resolve: (obj) => obj['wof:name']
  },
  'wof_children':{
    description: 'The avaliable children for this node',
    type: new GraphQLList(GraphQLString),
    resolve: (obj) => {return childrenLookup[obj['wof:placetype']]}
  },
  'wof_placetype':{
    description: 'The avaliable children for this node',
    type: GraphQLString,
    resolve: (obj) => obj['wof:placetype']
  },
  'geom_latitude':{
    description: 'Latitude of the point',
    type: GraphQLFloat,
    resolve:(obj) => obj['geom:latitude']
  },
  'geom_longitude':{
    description: 'latitude of the point',
    type: GraphQLFloat,
    resolve:(obj) => obj['geom:longitude']
  },
  'geom_area':{
    description: 'Area of geom',
    type: GraphQLFloat,
    resolve:(obj) => obj['geom:area']
  },
  'geom_area_square_meter':{
    description: 'Area of geom in square meters',
    type: GraphQLFloat,
    resolve:(obj) => obj['geom:area_square_m']
  },
  'geom_bbox':{
    description: 'Bounding box of the feature',
    type: GraphQLString,
    resolve:(obj) => obj['geom:bbox']
  },
  'git_url':{
    description: 'latitude of the point',
    type: GraphQLString,
    resolve:(obj) => resolveWOFURL(obj['wof:id'])
  },
  'geometry':{
    description:'The Geometry',
    type: GeoJSON,
    resolve:(obj) => fetchGeoJSON(obj['wof:id'])
  }
}

const WOFParentType= new GraphQLObjectType({
  name:'parent',
  description: 'Parent of this node',
  fields: WOFFields
})


const WOFCommonArgs = {
    id: {type: GraphQLInt},
    lat: {type:GraphQLFloat},
    lng:{type: GraphQLFloat},
    name:{type: GraphQLString},
    bbox:{type: new GraphQLList(GraphQLFloat)},
    near:{type: new GraphQLList(GraphQLFloat)},
    radius:{type: GraphQLFloat}
}

const searchMethod= (query,root) => {
   if(root){
      return{
        id: root['wof:id'],
        method: 'whosonfirst.places.getDescendants'
      }
   }
   if(query.id){
      return{
        id: query.id,
        method: 'whosonfirst.places.getDescendants'
      }
   }
   if(query.name){
      return{
        name: query.name,
        method: 'whosonfirst.places.search'
      }
   }
   if(query.lat && query.lng){
      return {
        latitude: query.lat,
        longitude: query.lng,
        method: 'whosonfirst.places.getByLatLon'
      }
   }
   else if(query.bbox){
      return{
        method:'whosonfirst.places.getIntersects',
        min_latitude:  query.bbox[0],
        min_longitude: query.bbox[1],
        max_latitude:  query.bbox[2],
        max_longitude: query.bbox[3]
      }
   }
   else if(query.near && query.radius){
      return{
        method: 'whosonfirst.places.getNearby',
        latitude: query.near[0],
        longitude: query.near[1],
        radius: query.radius
      }
   }
}

const constructWOFTypesAndFields = ()=>{
  return getCommonPlacetypes().then((wofTypes)=>{

     //GENERATE LOOKUP FOR CHILD NODES
     wofTypes.forEach((details)=>{
        const children = getWOFChildrem(details.name, wofTypes)
        childrenLookup[details.name] = children
     })
     
     wofTypes.forEach((details)=>{
        makeWOFType(details.name,details.name)
     })

     wofTypes.forEach((details)=>{
        fields[details.name] = makeWOFField(details.name, details.name, types[details.name])
     })
     return {types, fields} 
  })
}

const getWOFChildrem = (name, wofTypes) => {
  return wofTypes.filter((t) => t.parents.indexOf(name) >-1)
          .map((t)=> t.name)
}

const makeWOFField = (name,description, type) => {
  return{
    type: new GraphQLList(type),
    description: description,
    args: WOFCommonArgs,
    resolve: (root,args,context) =>{
      return fetchWOF(root,args,name)
    }
  }
}

const makeWOFType = (name,description) => {
  
  if(types[name]){
    return 
  }

  const children = childrenLookup[name]
  console.log(' has children ', children)

  children.forEach((child)=>{
    if(types[child]){
      console.log('child ',child,' already generated')
      return 
    }
    else{
      console.log('child',child,' has not been created, creating')
      makeWOFType(child,child)
    }
  })

  const completeChildren = children.reduce((map,child)=> {
    map[child] = {
      name:child,
      description:child,
      type :new GraphQLList(types[child]),
      resolve: (root,args,context) =>{
        return fetchWOF(root,args,child)
      }
    }
     
    return map}, {})

  const getchGeoJSON=(id)=>{
    
  }

  const geomField={
    "geom":{
      type: GraphQLObjectType,
      resolve:(root,args,context)=>{
        return fetchGEOJSON(root['wof:id'])
      }
    }
  }
  const parentsField ={
    'parents':{
      type: new GraphQLList(WOFParentType),
      resolve: (root,args,context) =>{
        return fetchWOF(root,{'id':root['wof:parent_id']},null)
      } 
    }
  }  
   
  const parentField = {
    'parent':{
      type:WOFParentType,
      resolve: (root,args,context) =>{
        return fetchWOF(root,{'id':root['wof:parent_id']},null)
               .then((res)=>{
               console.log('PARENT FIELD IS ',res);
               return res[0]})
      } 
    }
  }

  types[name] = new GraphQLObjectType({
		name: name,
		description: description,
	  fields: Object.assign({},WOFFields, completeChildren, parentField,parentsField)
  })
  console.log('types are ', types)
}

const getCommonPlacetypes = ()=>{
  var query = {
    'method' : 'whosonfirst.placetypes.getList'
  }
  return WOFQuery(query).then((res)=>res.placetypes)
}

const resolveWOFURL = (id)=>{
  console.log('trying toresolve id', id)
  var sid  = String(id)
  var sid1 = sid.slice(0,3)
  var sid2 = sid.slice(3,6)
  var sid3 = sid.slice(6,)
  return `https://raw.githubusercontent.com/whosonfirst-data/whosonfirst-data/master/data/${sid1}/${sid2}/${sid3}/${sid}.geojson`
}

const fetchWOF = (root,query,placetype)=>{
  console.log("placetype is ", placetype,'root is ',root)
  var params = searchMethod(query,root)
  if(placetype){
    params.placetype=placetype
  }
  params.extras='geom:latitude,geom:longitude,geom:area_square_m,geom:area,geom:bbox'
  return WOFQuery(params).then(res=>res.places).then((res) =>{console.log(res); return res})
}

const fetchGeoJSON = (id)=>{
  console.log('fetching geojson for ',id)
  return fetch(resolveWOFURL(id)).then((res) => res.json()).then((res)=>res['geometry']).then((res)=>{
    console.log(res)
    return res
  })
}


const WOFQuery = (params)=>{
	params.api_key = MapZenAPIKEY
	params.format = 'json'
  console.log('running query ',params)
	var cleanQuery = Object.keys(params).map((key) => `${key}=${encodeURIComponent(params[key])}`).join('&')
  var fullURL = `${MapZenBaseURL}?${cleanQuery}`
	return fetch(fullURL).then((res)=>res.json())
}

module.exports={ fetchWOF,  WOFFields, constructWOFTypesAndFields, WOFCommonArgs }
