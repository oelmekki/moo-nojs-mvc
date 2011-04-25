/*
---

name: ClassMethods

description: provide a way to have class methods

license: MIT-style license.

author: Olivier El Mekki
  based on http://www.anup.info/2010/07/12/mootools-class-methods-and-inheritance/

provides: [Class.Mutators.ClassMethods]

...
*/
Class.Mutators.ClassMethods = function( methods ){
  this.__classMethods = Object.append( this.__classMethods || {}, methods );
  this.extend( methods );
};

Class.Mutators.Extends = function( parent ){
  this.parent = parent;
  parent.$prototyping = true;
  this.prototype = new parent;
  delete parent.$prototyping;
  this.extend( parent.__classMethods );
};
