(function(){
/*
---

name: Framework.Controller

description: base class for Controllers

license: MIT-style license.

author: Olivier El Mekki

provides: [Framework.Controller]

...
*/
this.Controller = new Class({
  Implements: [ Options ],

  options: {
    View: this.View,
    events: {},
    before_filters: [],
    dependencies: {}
  },


  initialize: function( $element, options, location ){
    if ( ! $element ){
      return false;
    }

    var run = true;

    this.setOptions( options );

    for ( key in this.options.dependencies ){
       if ( this.options.dependencies.hasOwnProperty( key ) ){
          this.options[ key ] = this.options.dependencies[ key ];
       }
    }

    this.$element = $element;
    this.createView();
    
    this.location = location || window.location;

    this.options.before_filters.each( function( filter ){
      if ( run && this[ filter ]() === false ){
        run = false;
      }
    }.bind( this ));

    if ( run ){
      if ( this.view.options && this.view.options.async_run ){
        this.view.addEvent( 'ready', function(){
          this.beforeBindEvents();

          if ( typeof ENV == 'undefined' || ENV != 'test' ){
             this.bindEvents();
          }

          this.run();
        }.bind( this ));

        this.view.run();
      }

      else {
        this.view.run();
        this.beforeBindEvents();

        if ( typeof ENV == 'undefined' || ENV != 'test' ){
           this.bindEvents();
        }

        this.run();
      }
    }
  },


  createView: function(){
    this.view = new this.options.View( this.$element, { dependencies: this.options.dependencies });
  },


  beforeBindEvents: function(){
  },


  run: function(){
  },


  bindEvents: function(){
    ( new Hash( this.options.events )).each( function( e ){
      this.bindEvent( e );
    }.bind( this ));
  },


  bindEvent: function( e ){
    var callback_name, wrapper_func, view;

    callback_name = this._getCallbackName( e );
    view = this.view;

    if ( e.delegate ){
      wrapper_func = function( event, callback ){
        event.stop();

        var sel, $target = $( event.target );

        sel = view.options.selectors[ e.delegate ];

        if ( typeof sel != 'string' ){
          sel = sel.sel;
        }

        if ( $target.getParent( sel ) ){
          $target = $target.getParent( sel );
        }

        if ( $target.match( sel ) ){
          if ( e.stop === true || ( e.type == 'click' && e.stop !== false ) ){
            event.stop();
          }

          callback( $target, event );
        }
      };
    }

    else {
      wrapper_func = function( event, callback ){
        if ( e.stop === true || ( e.type == 'click' && e.stop !== false ) ){
          event.stop();
        }

        var $target = $( event.target );
        callback( $target, event );
      };
    }

    if ( ! this[ callback_name ] ){
      this[ callback_name ] = function( $target, event ){
        if ( e.view_method ){
          this.view[ e.view_method ]( $target );
        }

        else {
          this.view[ callback_name ]( $target );
        }
      }.bind( this );
    }

    // handles cancel delay
    if ( e.cancel_delay && e.cancel_delay > 0 ){
      this.view.get( e.el ).addEvent( e.type, function( event ){
        window.clearTimeout( this[ callback_name + '_timeout' ] );

        this[ callback_name + '_timeout' ] = window.setTimeout( function(){
          wrapper_func( event, this[ callback_name ].bind( this ) );
        }.bind( this ), e.cancel_delay );
      }.bind( this ));
    }

    // direct execution
    else {
      this.view.get( e.el ).addEvent( e.type, function( event ){
        wrapper_func( event, this[ callback_name ].bind( this ) );
      }.bind( this ));
    }
  },


  _getCallbackName: function( e ){
    if ( e.controller_method ){
      return e.controller_method;
    }

    if ( e.view_method ){
      return e.view_method;
    }

    return e.el + e.type.capitalize() + ( e.type.match( /e$/ ) ? 'd' : 'ed' );
  }
});
}).apply(Framework);

