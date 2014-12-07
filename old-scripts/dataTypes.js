// Universal Module Pattern -- modified from https://github.com/umdjs/umd/blob/master/returnExports.js
// Uses Node, AMD or browser globals to create a module.

(function (root, deps, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(deps, factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.

        module.exports = factory.apply(this, deps.map(function(dep){ return require(dep);}));
    } else {
        // Browser globals (root is window)
        root.returnExports = factory.apply(this, deps.map(function(dep){ return root[dep];}));
    }
}(this, ['lodash', './aggTypes'], function (_, at) {


  var dt = {}, DataType;
  DataType = (function(){
    var d = function(name, short, parent, aggTypes){
      this.name = name;
      this.short = short;
      this.parent = parent || null;
      if(parent) parent.addChild(this);
      this.children = [];
      this.specificity = (parent && parent.specificity || 0) + 1; //for checking chart requirement

      this.aggTypes = aggTypes || [at.RAW];
      if(aggTypes){
        //FIXME will i need this later?
      }
    };
    var prototype = d.prototype;

    prototype.addChild = function(child){
      this.children.push(child);
    };


    prototype.isType = function(type){
      var typeName = typeof type === "string" ? type : type.name;
      if(typeName == this.name) return true;
      return this.parent ? this.parent.isType(typeName) : false;
    };

    prototype.allSubtypes = function(){
      if(this._allSubTypes) return this._allSubTypes; //cache

      var q = [this], i;
      for(i=0; i<q.length;i++){
        q.push.apply(q,q[i].children);
      }

      return (this._allSubTypes = q);
    };

    prototype.toString = function(){ return this.name; };
    return d;
  })();

  dt.categorical = new DataType("categorical", "C");
  dt.ordinal = new DataType("ordinal", "O", dt.categorical);
  dt.interval = new DataType("interval","I", dt.ordinal);

  //TODO measures name
  dt.datetime = new DataType("datetime", "D", dt.interval, [at.YEAR,at.MONTH,at.DAY, at.HOUR, at.MINUTE, at.SECOND]);
  //TODO(kanitw): time?

  dt.geographic = new DataType("geographic", "G", dt.categorical);

  dt.aggregate = new DataType("aggregate","A",null);
  dt.quantitative = new DataType("quantitative", "Q", dt.aggregate, [at.SUM, at.AVG, at.MIN, at.MAX, at.MEDIAN]);
  //TODO(kanitw): currency, duration, ...

  dt.count = new DataType("count", "#", dt.aggregate, [at.SUM]);
  //TODO(kanitw): How do I engineer binning in this type system?

  /** available types sorted by specificity */
  dt.TYPES = _.sortBy(
    [dt.categorical, dt.ordinal, dt.interval, dt.datetime, dt.geographic, dt.quantitative, dt.count],
    function(x){return -x.specificity;}
    );

  dt.TYPE_NAMES = _.pluck(dt.TYPES,"name");

  dt.TYPES.forEach(function(t){ dt[t.short] = t; });

  dt.isType = function(sub, parent){
    if(typeof sub ==='string') sub = dt[sub];
    return DataType.prototype.isType.call(sub, parent);
  };
  // Representation reduction!

  // console.log(dt.TYPES.map(function(x){return x.name+","+ x.specificity;}));
  // console.log(dt.TYPE_NAMES);

  // module.exports = dt;
  return dt;
}));








