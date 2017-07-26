'use strict';

var _graphql = require('graphql');

var fetch = require('node-fetch');
var fs = require('fs');

var MapZenBaseURL = 'https://whosonfirst-api.mapzen.com';
var MapZenAPIKEY = process.env.mapzen_api_key;

// Probably want to fix this at some point
var childrenLookup = {};
var types = {};
var fields = {};

var GeoJSON = new _graphql.GraphQLScalarType({
  name: 'GeoJSON',
  serialize: function serialize(value) {
    // console.log('serialize value', value);
    return value;
  },
  parseValue: function parseValue(value) {
    // console.log('parseValue value', value);
    return value;
  },
  parseLiteral: function parseLiteral(ast) {
    // console.log('parseLiteral ast', ast);
    return ast.value;
  }
});

var WOFFields = {
  'wof_id': {
    description: 'Who\'s on first ID',
    type: _graphql.GraphQLInt,
    resolve: function resolve(obj) {
      return obj['wof:id'];
    }
  },
  'wof_parent_id': {
    description: 'Who\'s on parent ID',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return obj['wof:parent_id'];
    }
  },
  'wof_name': {
    description: 'Who\'s on first name',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return obj['wof:name'];
    }
  },
  'wof_children': {
    description: 'The avaliable children for this node',
    type: new _graphql.GraphQLList(_graphql.GraphQLString),
    resolve: function resolve(obj) {
      return childrenLookup[obj['wof:placetype']];
    }
  },
  'wof_placetype': {
    description: 'The avaliable children for this node',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return obj['wof:placetype'];
    }
  },
  'geom_latitude': {
    description: 'Latitude of the point',
    type: _graphql.GraphQLFloat,
    resolve: function resolve(obj) {
      return obj['geom:latitude'];
    }
  },
  'geom_longitude': {
    description: 'latitude of the point',
    type: _graphql.GraphQLFloat,
    resolve: function resolve(obj) {
      return obj['geom:longitude'];
    }
  },
  'geom_area': {
    description: 'Area of geom',
    type: _graphql.GraphQLFloat,
    resolve: function resolve(obj) {
      return obj['geom:area'];
    }
  },
  'geom_area_square_meter': {
    description: 'Area of geom in square meters',
    type: _graphql.GraphQLFloat,
    resolve: function resolve(obj) {
      return obj['geom:area_square_m'];
    }
  },
  'geom_bbox': {
    description: 'Bounding box of the feature',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return obj['geom:bbox'];
    }
  },
  'git_url': {
    description: 'Link to geojson on github',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return resolveWOFGitHUbURL(obj['wof:id']);
    }
  },
  'mz_uri': {
    description: 'GeoJSON URL for place',
    type: _graphql.GraphQLString,
    resolve: function resolve(obj) {
      return obj['mz:uri'];
    }
  },
  'geometry': {
    description: 'The Geometry',
    type: GeoJSON,
    resolve: function resolve(obj) {
      return fetchGeoJSON(obj['wof:uri']);
    }
  }
};

var WOFParentType = new _graphql.GraphQLObjectType({
  name: 'parent',
  description: 'Parent of this node',
  fields: WOFFields
});

var WOFCommonArgs = {
  id: { type: _graphql.GraphQLInt },
  lat: { type: _graphql.GraphQLFloat },
  lng: { type: _graphql.GraphQLFloat },
  name: { type: _graphql.GraphQLString },
  bbox: { type: new _graphql.GraphQLList(_graphql.GraphQLFloat) },
  near: { type: new _graphql.GraphQLList(_graphql.GraphQLFloat) },
  radius: { type: _graphql.GraphQLFloat }
};

var searchMethod = function searchMethod(query, root) {
  if (root) {
    return {
      id: root['wof:id'],
      method: 'whosonfirst.places.getDescendants'
    };
  }
  if (query.id) {
    return {
      id: query.id,
      method: 'whosonfirst.places.getDescendants'
    };
  }
  if (query.name) {
    return {
      name: query.name,
      method: 'whosonfirst.places.search'
    };
  }
  if (query.lat && query.lng) {
    return {
      latitude: query.lat,
      longitude: query.lng,
      method: 'whosonfirst.places.getByLatLon'
    };
  } else if (query.bbox) {
    return {
      method: 'whosonfirst.places.getIntersects',
      min_latitude: query.bbox[0],
      min_longitude: query.bbox[1],
      max_latitude: query.bbox[2],
      max_longitude: query.bbox[3]
    };
  } else if (query.near && query.radius) {
    return {
      method: 'whosonfirst.places.getNearby',
      latitude: query.near[0],
      longitude: query.near[1],
      radius: query.radius
    };
  }
};

var constructWOFTypesAndFields = function constructWOFTypesAndFields() {
  return getCommonPlacetypes().then(function (wofTypes) {

    //GENERATE LOOKUP FOR CHILD NODES
    wofTypes.forEach(function (details) {
      var children = getWOFChildrem(details.name, wofTypes);
      childrenLookup[details.name] = children;
    });

    wofTypes.forEach(function (details) {
      makeWOFType(details.name, details.name);
    });

    wofTypes.forEach(function (details) {
      fields[details.name] = makeWOFField(details.name, details.name, types[details.name]);
    });
    return { types: types, fields: fields };
  });
};

var getWOFChildrem = function getWOFChildrem(name, wofTypes) {
  return wofTypes.filter(function (t) {
    return t.parents.indexOf(name) > -1;
  }).map(function (t) {
    return t.name;
  });
};

var makeWOFField = function makeWOFField(name, description, type) {
  return {
    type: new _graphql.GraphQLList(type),
    description: description,
    args: WOFCommonArgs,
    resolve: function resolve(root, args, context) {
      return fetchWOF(root, args, name);
    }
  };
};

var makeWOFType = function makeWOFType(name, description) {

  if (types[name]) {
    return;
  }

  var children = childrenLookup[name];
  console.log(' has children ', children);

  children.forEach(function (child) {
    if (types[child]) {
      console.log('child ', child, ' already generated');
      return;
    } else {
      console.log('child', child, ' has not been created, creating');
      makeWOFType(child, child);
    }
  });

  var completeChildren = children.reduce(function (map, child) {
    map[child] = {
      name: child,
      description: child,
      type: new _graphql.GraphQLList(types[child]),
      resolve: function resolve(root, args, context) {
        return fetchWOF(root, args, child);
      }
    };

    return map;
  }, {});

  var getchGeoJSON = function getchGeoJSON(id) {};

  var geomField = {
    "geom": {
      type: _graphql.GraphQLObjectType,
      resolve: function resolve(root, args, context) {
        return fetchGEOJSON(root['wof:id']);
      }
    }
  };
  var parentsField = {
    'parents': {
      type: new _graphql.GraphQLList(WOFParentType),
      resolve: function resolve(root, args, context) {
        return fetchWOF(root, { 'id': root['wof:parent_id'] }, null);
      }
    }
  };

  var parentField = {
    'parent': {
      type: WOFParentType,
      resolve: function resolve(root, args, context) {
        return fetchWOF(root, { 'id': root['wof:parent_id'] }, null).then(function (res) {
          console.log('PARENT FIELD IS ', res);
          return res[0];
        });
      }
    }
  };

  types[name] = new _graphql.GraphQLObjectType({
    name: name,
    description: description,
    fields: Object.assign({}, WOFFields, completeChildren, parentField, parentsField)
  });
  console.log('types are ', types);
};

var getCommonPlacetypes = function getCommonPlacetypes() {
  var query = {
    'method': 'whosonfirst.placetypes.getList'
  };
  return WOFQuery(query).then(function (res) {
    return res.placetypes;
  });
};

var resolveWOFGitHubURL = function resolveWOFGitHubURL(id) {
  console.log('trying toresolve id', id);
  var sid = String(id);
  var sid1 = sid.slice(0, 3);
  var sid2 = sid.slice(3, 6);
  var sid3 = sid.slice(6);
  return 'https://raw.githubusercontent.com/whosonfirst-data/whosonfirst-data/master/data/' + sid1 + '/' + sid2 + '/' + sid3 + '/' + sid + '.geojson';
};

var fetchWOF = function fetchWOF(root, query, placetype) {
  console.log("placetype is ", placetype, 'root is ', root);
  var params = searchMethod(query, root);
  if (placetype) {
    params.placetype = placetype;
  }
  params.extras = 'geom:latitude,geom:longitude,geom:area_square_m,geom:area,geom:bbox,mz:uri';
  return WOFQuery(params).then(function (res) {
    return res.places;
  }).then(function (res) {
    console.log(res);return res;
  });
};

var fetchGeoJSON = function fetchGeoJSON(url) {
  return fetch(url).then(function (res) {
    return res.json();
  }).then(function (res) {
    return res['geometry'];
  }).then(function (res) {
    console.log(res);
    return res;
  });
};

var WOFQuery = function WOFQuery(params) {
  params.api_key = MapZenAPIKEY;
  params.format = 'json';
  console.log('running query ', params);
  var cleanQuery = Object.keys(params).map(function (key) {
    return key + '=' + encodeURIComponent(params[key]);
  }).join('&');
  var fullURL = MapZenBaseURL + '?' + cleanQuery;
  return fetch(fullURL).then(function (res) {
    return res.json();
  });
};

module.exports = { fetchWOF: fetchWOF, WOFFields: WOFFields, constructWOFTypesAndFields: constructWOFTypesAndFields, WOFCommonArgs: WOFCommonArgs };