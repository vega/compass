Visrec: Visualization Recommendation.
=========

Visrec is a module for generating and ranking visualizations.
Given user query, Visrec produces ranked group of visualization described using [vegalite](http://github.com/uwdata/vegalite).


## Setting up Visrec Demo for Development

Visrec depends on vegalite and vega (vegalite modified).
Currently vegalite is in active development.

To develop, you should clone visrec and vegalite repo into the same root folder (e.g., `_visrec`)
and create a symlink to the relative vegalite path. 

```
ln -s ../vegalite node_modules/vegalite
```

We will update this dependency later ([#20](https://github.com/uwdata/visrec/issues/20)).
