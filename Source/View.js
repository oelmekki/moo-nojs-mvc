(function(){
/*
---

name: Framework.View

description: base class for views

license: MIT-style license.

author: Olivier El Mekki

provides: [Framework.View]

...
*/
this.View = new Class({
  Implements: [ Options ],

  options: {
    selectors: {}
  },


  initialize: function( $element, options ){
    this.setOptions( options );
    this.$element = $element;
  },


  run: function(){
  },


  get: function( key ){
    var $el, selector, cache = true, multiple, within;

    if ( this.hasOwnProperty( '$' + key ) ){
      return this[ '$' + key ];
    }

    else if ( this[ 'get' + key.capitalize() ] ){
      return this[ 'get' + key.capitalize() ]();
    }

    selector = this.options.selectors[ key ];

    if ( typeof selector == 'undefined' ){
      throw new Error( 'view: Can\'t find "' + key + '" selector' );
    }

    within = 'element';

    if ( typeOf( selector ) !== 'string' ){
      if ( selector.hasOwnProperty( 'cache' ) ){
        cache = selector.cache;
      }

      if ( selector.hasOwnProperty( 'within' ) ){
        within = selector.within;
      }

      multiple = selector.multiple;
      selector = selector.sel;
    }

    $el = this.get( within )[ multiple ? 'getElements' : 'getElement' ]( selector );

    if ( cache ){
      this[ '$' + key ] = $el;
    }

    return $el;
  }
});
}).apply(Framework);
