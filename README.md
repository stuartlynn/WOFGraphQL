# WOFGrpahQL

This is a proof of concept [GraphQL](http://graphql.org/) interface for [Who's On First](https://whosonfirst.mapzen.com/)

Play with it on heroku( it's not backed by a paid dyno so it might be down when you try ....)

[https://wofgraphql.herokuapp.com/graphql](http://bit.ly/2h3mWA2)

## Instructions

To run locally, put your `mapzen_api_key` in a .env file. Then simply do:

```bash
npm install
npm start
```

Then head to ```http://localhost:4000/graphql```

## Example queries

### [Grab a locality by lat and lng and list its neighborhoods and their areas + any microhoods in those areas](http://bit.ly/2v81C2I)

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

### [Grab a neighborhood in NY by name get it's geometry and it's children](http://bit.ly/2w09TSH)

```
{
  neighbourhood(name:"Canarsie"){
    wof_name
    wof_children
    geometry
  }
}
```


### [Grab a neighborhood in NY by name get it's geometry and it's children](http://bit.ly/2tDnte8)

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
## Next steps

- [ ] Integrate with Census API to bring back census variables/geoms based on WOF regions
- [ ] Build visual interface to view the results of the query
