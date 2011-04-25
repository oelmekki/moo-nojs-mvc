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
    events: [],
    before_filters: []
  },


  initialize: function( $element, options, location ){
    var run = true;

    this.setOptions( options );
    this.$element = $element;
    this.view = new this.options.View( this.$element );
    
    this.location = location || window.location;

    this.options.before_filters.each( function( filter ){
      if ( run && this[ filter ]() === false ){
        run = false;
      }
    }.bind( this ));

    if ( run ){
      this.view.run();

      if ( typeof ENV == 'undefined' || ENV != 'test' ){
         this.bindEvents();
      }

      this.run();
    }
  },


  run: function(){
  },


  bindEvents: function(){
    this.options.events.each( function( e ){
      this.bindEvent( e );
    }.bind( this ));
  },


   bindEvent: function( e ){
      var callback_name, wrapper_func, view;

      callback_name = this._getCallbackName( e );
      view = this.view;

      if ( e.delegate ){
        wrapper_func = function( event, callback ){
          var sel, $target = $( event.target );

          sel = view.options.selectors[ e.delegate ];

          if ( typeof sel != 'string' ){
            sel = sel.sel;
          }

          if ( $target.getParent( sel ) ){
            $target = $target.getParent( sel );
          }

          if ( $target.match( sel ) ){
            event.stop();
            callback( $target, event );
          }
        };
      }

      else {
        wrapper_func = function( event, callback ){
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

    return e.el + e.type.capitalize() + ( e.type.match( /e$/ ) ? 'd' : 'ed' );
  }
});
}).apply(Framework);

