moo-nojs-mvc
============


Why?
----

For some times now, I use mvc pattern in my javascript code. I think of my apps as a set
of modules, each one having its micro-mvc implemented. Models handle requests and data
computation, views handle dom manipulation and controllers handle events and model/view
leverage.

I found several libs that provide strong mvc support for mootools. Still, their view
part was mostly a templating system that build DOM from javascript.

While I have no problem with creating elements from mootools, that's definely not the main
purpose I want for my views. I strongly believe in nojs support (well, i would call that
non-obstrusive support, but this term is more and more used to simply refer the fact there
is no javascript in .html), which mean that features are in server side code, not in
javascript code. Javascript only add or change behaviours.

Thus, most of DOM elements javascript will need already exist before javascript is 
executed, even if it has to be dramaticaly altered. What I found myself doing again and
again in javascript views is to write getter methods and to cache their result.

That's what I want a mvc view class to do : provide an easy way to configure set of
getters the most expressive possible in the fewer lines possible, so it's easy to track
and the controllers can use elements without worrying about how to retrieve them.


Usage
-----

### Controller

Controllers are all about events. They usually ask views for elements on which to attach
events, but should be totally css selectors agnostic (that's the view job to centralize
selectors). They also often provide wrapper callback function that execute tasks (such
as stopping event) before asking for a DOM modification to the view when an event is
fired.

Here too, I found myself doing again and again the same things :

* attach events
* write callback methods to stop event and call view methods
* check for target in case of delegation
* add/clear timeout for delayed execution (such as autocompleters' keyup)

It usually gives something like that :

  (function(){
  this.MyController = new Class({ 
    Implements: [ Options ],

    options: {
      View: this.MyView,
      User: this.User
    },

    initialize: function( $element, options ){
      this.setOptions( options );
      this.$element = $element;
      this.view = new this.options.View( $element );
    },

    run: function(){
      this.bindEvents();
    },

    bindEvents: function(){
      this.view.getShowTrigger().addEvent( 'click', this.showClicked.bind( this ) );
      this.view.getHideTrigger().addEvent( 'click', this.hideClicked.bind( this ) );
      this.view.getUserList().addEvent( 'click', this.userListClicked.bind( this ) );
      this.view.getSearch().addEvent( 'keyup', this.searchKeyuped.bind( this ) );
    },

    showClicked: function( event ){
      event.stop();
      this.view.show();
    },

    hideClicked: function( event ){
      event.stop();
      this.view.hide();
    },

    userListClicked: function( event ){
      var $target, user;

      $target = $( event.target );

      // let not fail if html dev decided there should be a span or an img in the link
      if ( $target.getParent( 'a' ) ){
        $target = $target.getParent( 'a' );
      }

      if ( $target.match( '.delete' ) ){
        event.stop();
        user = new this.options.User( $target.get( 'data-id' ) );
        user.destroy( this.view.hideUser.bind( this.view ) );
      }

      if ( $target.match( '.hide' ) ){
        event.stop();
        user = new this.options.User( $target.get( 'data-id' ) );
        this.view.hideUser( user );
      }
    },

    searchKeyuped: function(){
      window.clearTimeout( this.search_timeout );

      window.setTimeout( function(){
        this.options.User.find_all( this.view.getSearch().get( 'value' ), this.view.filterUsers.bind( this.view ) );
      }.bind( this ), 1000 );
    }
  });
  }).apply( typeof exports != 'undefined' ? global : this );


Geez, we really need near than 70 LOC for that?

Here is the same using my controller lib :

  (function(){
  this.MyController = new Class({ 
    Extends: Framework.Controller,
    Implements: [ Options ],

    options: {
      View: this.MyView,
      User: this.User,
      events: [ 
        { element: 'showTrigger', type: 'click', view_method: 'show' },
        { element: 'hideTrigger', type: 'click', view_method: 'hide' },
        { element: 'userList', delegate: 'deleteLink', controller_method: 'deleteLinkClicked', type: 'click' },
        { element: 'userList', delegate: 'hideLink', controller_method: 'hideLinkClicked', type: 'click' },
        { element: 'search', type: 'keyup', cancel_delay: 1000 }
      ]
    },

    deleteLinkClicked: function( $target, event ){
      var user;
      user = new this.options.User( $target.get( 'data-id' ) );
      user.destroy( this.view.hideUser.bind( this.view ) );
    },

    hideLinkClicked: function( $target, event ){
      var user;
      user = new this.options.User( $target.get( 'data-id' ) );
      this.view.hideUser( user );
    }

    searchKeyuped: function(){
      this.options.User.find_all( this.view.get( 'search' ).get( 'value' ), this.view.filterUsers.bind( this.view ) );
    }
  });
  }).apply( typeof exports != 'undefined' ? global : this );


Way better! We cut code by half, and there is only 5 events, here. The more you have,
the more dramatical the cut is.

A few explainations, now. Most of the configuration is done is the "events"
option. .bindEvents() will be call upon controller initialization and will pass each
event option to .bindEvent() (that also means you can later add others events this way,
if you need to compute the event options, for example).

The first two events simply call view methods (show and hide). The event object is
automatically stopped. If that something you doesn't want, add your events manually
in the .run() method, but most of the time, we want to stop them.

The element key of the event option is the name of the view getter (see the view section
for more on that).

Here is the stack that determine what method to call :

* if controller_method is set, use that method
* if a method named after the element and type option exist, use it (ex: link + click = linkClicked)
* if view_method is set, call it directly (in fact, a wrapper is created that stop event, then call the view method)

Third and fourth events are about delegation. Simply give the wrapper element as element,
and what you want to delegate to has delegate. The lib will do the delegation, and
ensure to set the target as needed if the target has what we want as parent (if we clicked
the image in a link, we clicked the link, right? No need to wait for or rely on
propagation).

As we specified controller method for those events, it's what will be called. You can
note that the callback signature is the target as first param and the event as second.
It's always this way, because we often want to get $target in callback bound on the
our class' instance as "this".

Finaly, the fifth method is about delay. Since we didn't specified any controller or
view method, the method name will be compute against element and type names, so it
will be searchKeyuped. The cancel_delay key will ensure that if the event is fire
again within the delay value, the first call will be canceled.

That's about all for controller. Just one more thing : you can specify a before_filter
list in the options (it should be an array of controller method names). Those methods
will be called at initialization. If one return false (===), the events won't be bound
and the .run() method from the view won't be called.
