Visrec: Visualization Recommendation.
=========

Visrec is a module for generating and ranking visualizations.
Given user query, Visrec produces ranked group of visualization described using [vegalite](http://github.com/uwdata/vegalite).


## Setting up Visrec Demo for Development

Visrec depends on vegalite and vega (vegalite modified).
Currently vegalite is in active development.

To facilitate rapid development, you should clone visrec and vegalite repo into the same root folder (e.g., `_visrec`) and start a webserver from that folder.

```
_visrec ❯❯❯ python -m SimpleHTTPServer
```

Then you can access Visrec from http://localhost:8000/visrec/.

In the future, we will consider git submodule for better integrate.