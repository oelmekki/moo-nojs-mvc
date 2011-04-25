var Framework = window.Framework = {};

(function(){
/*
---

name: Framework.Model

description: base class for models

license: MIT-style license.

author: Olivier El Mekki

provides: [Framework.Model]

...
*/
this.Model = new Class({
  Implements: [ Options ],

  options: {
    Request: Request.JSON,
    base_url: '/',
    find: {
      path: '',
      method: 'get'
    },

    find_all: {
      path: '',
      method: 'get'
    },

    create: {
      path: '',
      method: 'post'
    },

    update: {
      path: '',
      method: 'put'
    },

    destroy: {
      path: '',
      method: 'delete'
    }
  },

  ClassMethods: {
    _cache: new Hash(),

    find: function( params, callback ){
      var instance, request;

      callback = callback || this.default_callback.bind( this );

      if ( typeOf( params ) == 'number' ){
        if ( this._cache.get( params ) ){
          this.found( callback, this._cache.get( params ), params );
        }
      }

      else {
        params = new Hash( params );

        request = new this.prototype.options.Request({
          url: this.compute_find_url( params ),
          method: this.prototype.options.find.method
        });

        request.addEvent( 'success', function( resp ){
          instance = this.build_from_find( resp );
          instance.is_new_record = false;
          instance.response_cache.find = resp;

          if ( instance.get( 'id' ) ){
            this._cache.set( instance.get( 'id' ), instance );
          }

          this.found( callback, instance, params );
        }.bind( this ));

        params = this.compute_find_params( params );
        request.send( this.prototype.options.find.method == 'get' ? params.toQueryString() : params );
      }
    },


    find_all: function( params, callback ){
      var instances, instance, request;

      callback = callback || this.default_callback.bind( this );
      params = new Hash( params );

      request = new this.prototype.options.Request({
        url: this.compute_find_all_url( params ),
        method: this.prototype.options.find_all.method
      });

      request.addEvent( 'success', function( resp ){
        instances = this.build_from_find_all( resp );
        this.found_all( callback, instances, params );
      }.bind( this ));

      params = this.compute_find_all_params( params );
      request.send( this.prototype.options.find_all.method == 'get' ? params.toQueryString() : params );
    },


    create: function( attributes, callback ){
      var instance, request;

      instance = this.build_from_create( resp );
      instance.response_cache.create = resp;
      instance.is_new_record = false;
      instance.before_create();

      callback = callback || this.default_callback.bind( this );
      attributes = new Hash( attributes );

      request = new this.prototype.options.Request({
        url: this.compute_create_url( attributes ),
        method: this.prototype.options.create.method
      });

      request.addEvent( 'success', function( resp ){
        instance.response_cache.create = resp;

        if ( instance.get( 'id' ) ){
          this._cache.set( instance.get( 'id' ), instance );
        }

        this.created( callback, instance, attributes );
        instance.after_create();
      }.bind( this ));

      attributes = this.compute_create_params( attributes );
      request.send( this.prototype.options.create.method == 'get' ? attributes.toQueryString() : attributes );
    },


    compute_find_url: function( params ){
      return this.prototype.options.base_url + this.prototype.options.find.path + params.get( 'id' );
    },


    compute_find_params: function( params ){
      return params.erase( 'id' );
    },


    build_from_find: function( resp ){
      return new this( resp );
    },


    found: function( callback, instance, params ){
      callback( instance, params );
    },


    compute_find_all_url: function( params ){
      return this.prototype.options.base_url + this.prototype.options.find_all.path;
    },


    compute_find_all_params: function( params ){
      return params;
    },


    build_from_find_all: function( resp ){
      var instance, instances = [];

      resp.each( function( attributes ){
        instance = new this( attributes );
        instance.response_cache.find_all = resp;
        instance.is_new_record = false;
        instances.push( instance );
      }.bind( this ));

      return instances;
    },


    found_all: function( callback, instances, params ){
      callback( instances, params );
    },


    compute_create_url: function( params ){
      return this.prototype.options.base_url + this.prototype.options.create.path;
    },


    compute_create_params: function( params ){
      return params;
    },


    build_from_create: function( params ){
      return new this( params );
    },


    created: function( callback, instance, attributes ){
      callback( instance, attributes );
    },


    default_callback: function(){
    }
  },

  response_cache : {
    find: null,
    find_all: null,
    create: null,
    update: null,
    destroy: null
  },


  initialize: function( attributes ){
    this.before_initialize();
    this._attributes = new Hash( attributes );
    this.is_new_record = ( this.get( 'id' ) ? false : true );
    this.after_initialize();
  },


  get: function( attributes ){
    var result;

    switch ( typeOf( attributes ) ){
      case 'string':
        return this._attributes.get( attributes );

      case 'array':
        result = new Hash();
        attributes.each( function( attribute ){
          result.set( attribute, this._attributes.get( attribute ) );
        }.bind( this ));
        return result;

      default:
        throw new Error( attributes + ' is neither a string nor an array' );

    }
  },


  set: function( attributes, value ){
    if ( typeOf( attributes ) == 'hash' ){
      this._attributes.extend( attributes );
    }

    else {
      this._attributes[ attributes ] = value;
    }
  },


  save: function( callback ){
    ( this.is_new_record ? this._create( callback ) : this._update( callback ) );
  },


  _create: function( callback ){
    var request, attributes;

    this.before_create();
    callback = callback || this.default_callback.bind( this );

    request = new this.options.Request({
      url: this.compute_create_url( this._attributes ),
      method: this.options.create.method
    });

    request.addEvent( 'success', function( resp ){
      this.response_cache.create = resp;
      this.is_new_record = false;
      this.created( callback );
      this.after_create();
    }.bind( this ));

    attributes = this.compute_create_params( this._attributes );
    request.send( this.options.create.method == 'get' ? attributes.toQueryString() : attributes );
  },


  _update: function( callback ){
    var request, attributes;

    this.before_update();
    callback = callback || this.default_callback.bind( this );

    request = new this.options.Request({
      url: this.compute_update_url( this._attributes ),
      method: this.options.update.method
    });

    request.addEvent( 'success', function( resp ){
      this.response_cache.update = resp;
      this.updated( callback );
      this.after_update();
    }.bind( this ));

    attributes = this.compute_update_params( this._attributes );
    request.send( this.options.update.method == 'get' ? attributes.toQueryString() : attributes );
  },


  created: function( callback ){
    callback( this );
  },


  updated: function( callback ){
    callback( this );
  },


  destroy: function( callback ){
    var request, attributes;

    this.before_destroy();

    callback = callback || this.default_callback.bind( this );

    if ( ! this.is_new_record ){
      request = new this.options.Request({
        url: this.compute_destroy_url( this._attribute ),
        method: this.options.destroy.method
      });

      request.addEvent( 'success', function( resp ){
        this.response_cache.destroy = resp;
        this.destroyed( callback );
        this.after_destroy();
      }.bind( this ));

      attributes = this.compute_destroy_params( this._attributes );
      request.send( this.options.destroy.method == 'get' ? attributes.toQueryString() : attributes );
    }

    else {
      throw new Error( "can't delete new record." );
    }
  },


  destroyed: function( callback ){
    callback( this );
  },


  update_attribute: function( attribute, value ){
    this._attributes[ attribute ] = value;
    this.save();
  },


  update_attributes: function( attributes ){
    this._attributes.extend( attributes );
    this.save();
  },


  default_callback: function(){
  },


  compute_create_url: function( params ){
    return this.options.base_url + this.options.create.path;
  },


  compute_create_params: function( params ){
    return params;
  },


  compute_update_url: function( params ){
    return this.options.base_url + this.options.update.path + params.get( 'id' );
  },


  compute_update_params: function( params ){
    return params;
  },


  compute_destroy_url: function(){
    return this.options.base_url + this.options.destroy.path + this.get( 'id' );
  },


  compute_destroy_params: function( params ){
    return new Hash();
  },


  // Filters

  before_initialize: function(){
  },


  after_initialize: function(){
  },


  before_save: function(){
  },


  after_save: function(){
  },


  before_create: function(){
  },


  after_create: function(){
  },


  before_update: function(){
  },


  after_update: function(){
  },


  before_destroy: function(){
  },


  after_destroy: function(){
  }
});
}).apply(Framework);
