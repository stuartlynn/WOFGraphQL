# Data Observatory GrpahQL

This is a proof of concept for accessing [Who's On First](https://whosonfirst.mapzen.com/) with [GraphQL](http://graphql.org/)

Play with it on heroku( it's not backed by a paid dyno so it might be down when you try ....)

[https://wofgraphql.herokuapp.com/graphql](https://wofgraphql.herokuapp.com/graphql?query={%0A%09locality(lat%3A40.7048504 lng%3A -73.9368162 ){%0A wof_name%0A geom_area%0A%09%09neighbourhood{%0A wof_name%0A geom_area_square_meter%0A %09microhood{%0A wof_name%0A }%0A }%0A }%0A %0A neighbourhood(name%3A"Canarsie"){%0A%09%09wof_name%0A wof_children%0A geometry%0A }%0A}&operationName=null)

## Instructions

To run locally, put your `mapzen\_api\_key` in a .env file. Then simply do:

```bash
npm install
npm start
```

Then head to ```http://localhost:4000/graphql```

## Example queries

### [Grab a locality by lat and lng and list its neighborhoods and their areas + any microhoods in those areas](https://wofgraphql.herokuapp.com/graphql?query={%0A%09locality(lat%3A40.7048504 lng%3A -73.9368162 ){%0A wof_name%0A%09%09geometry %09%0A%09%09neighbourhood{%0A wof_name%0A geom_area_square_meter%0A%09%09%09%0A %09microhood{%0A wof_name%0A }%0A }%0A }%0A}&operationName=null)

```
{
	locality(lat:40.7048504  lng: -73.9368162 ){
    wof_name
		geometry 	
		neighbourhood{
      wof_name
      geom_area_square_meter

    	microhood{
        wof_name
      }
    }
  }
}
```

### [Grab a neighborhood in NY by name get it's geometry and it's children](https://wofgraphql.herokuapp.com/graphql?query={%0A neighbourhood(name%3A"Canarsie"){%0A%09%09wof_name%0A wof_children%0A geometry%0A }%0A}&operationName=null)

```
{
  neighbourhood(name:"Canarsie"){
		wof_name
    wof_children
    geometry
  }
}
```


### [Grab a neighborhood in NY by name get it's geometry and it's children](https://wofgraphql.herokuapp.com/graphql?query={%0A macroregion(near%3A[42.274878 -2.517017] radius%3A200){%0A%09%09wof_name%0A wof_children%0A parents {%0A wof_id%0A wof_parent_id%0A wof_name%0A wof_placetype%0A geom_latitude%0A geom_longitude%0A geom_area%0A geom_area_square_meter%0A geom_bbox%0A git_url%0A }%0A%0A }%0A}&operationName=null)

```
{
  macroregion(near:[42.274878 -2.517017] radius:200){
		wof_name
    wof_children
    parents {
      wof_id
      wof_parent_id
      wof_name
      wof_placetype
      geom_latitude
      geom_longitude
      geom_area
      geom_area_square_meter
      geom_bbox
      git_url
    }
  }
}

```
