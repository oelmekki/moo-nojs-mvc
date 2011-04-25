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


### View

As said before, the main purpose of a view is to avoid writing fifty getters methods
just to return a .getElement().

Here is what it looks without moo-nojs-mvc :

    (function(){
    this.MyView = new Class({ 
      Implements: [ Options ],

      options: {
        Fx: Fx.Morph
      },

      initialize: function( $element, options ){
        this.setOptions( options );
        this.$element = $element;
        this.list_fx = new this.options.FX( this.getUserList(), { link: 'cancel' });
      },

      getUserList: function(){
        return this.$user_block || ( this.$userBlock = this.$element.getElement( '#users' ) );
      },

      getUsers: function(){
        return this.getUserList().getElements( '.user' );
      },

      getActionBlock: function(){
        return this.$actionBlock || ( this.$actionBlock = this.$element.getElement( '.actions' ) );
      },

      getSearch: function(){
        return this.$search || ( this.$search = this.getActionBlock().getElement( 'input[type="search"]' ) );
      },

      getStatusFilters: function(){
        return this.$status_filters || ( this.$status_filters = this.getActionBlock().getElements( 'a.status' ) );
      },

      getLetterFilter: function(){
        return this.getActionBlock().getElement( '.letters' );
      },

      getPagination: function(){
        return this.$element.getElement( '.pagination' );
      },

      regenerateUserList: function( users ){
        this.getUserList().empty().setStyles({ height: 0, opacity: 0 });

        users.each( function( user ){
          this.addUser( user );
        }.bind( this ));

        this.list_fx.start({ height: 750, opacity: 1 });
      },

      addUser: function( user ){
        var $user;

        $user = new Element( 'div.user' ).set( 'data-id', user.get( 'id' ) ).inject( this.getUserList() );
        ( new Element( 'h3.name' ) ).set( 'text', user.get( 'name' ) ).inject( $user );
        ( new Element( 'a.delete[data-method="delete"][text="delete"]' ) ).inject( $user );
      }
    });
    }).apply( typeof exports == 'undefined' ? this : global );


The point is, the controller should not use any css selector by itself. So, for whatever he may
need, wether it want to bind an event or to retrieve a data-* attribute, it has to request a
getter from the view.

This can quickly lead to very long and very boring to read file. In the previous example, what
really matters is the regenerateUserList() et addUser() methods. All but those methods are
garbage. So now, either we put css in controller to avoid verbose code, and we chase any
selector each time we modify the html code, or we find a better way to handle getters.

I choosed the second solution. Here is what it looks like with moo-nojs-mvc :


    (function(){
    this.MyView = new Class({ 
      Extends: Framework.View,
      Implements: [ Options ],

      options: {
        Fx: Fx.Morph,
        selectors: {
          userList: '#users',
          users: { sel: '.user', within: 'userList', cache: false, multiple: true },
          actionBlock: '.actions',
          search: { sel: 'input[type="search"]', within: 'actionBlock' },
          statusFilters: { sel: 'a.status', within: 'actionBlock', multiple: true },
          letterFilter: { sel: '.letters', within: 'actionBlock' },
          pagination: { sel: '.pagination', cache: false }
        }
      },

      run: function(){
        this.list_fx = new this.options.FX( this.get( 'userList' ), { link: 'cancel' });
      },

      regenerateUserList: function( users ){
        this.get( 'userList' ).empty().setStyles({ height: 0, opacity: 0 });

        users.each( function( user ){
          this.addUser( user );
        }.bind( this ));

        this.list_fx.start({ height: 750, opacity: 1 });
      },

      addUser: function( user ){
        var $user;

        $user = new Element( 'div.user' ).set( 'data-id', user.get( 'id' ) ).inject( this.get( 'userList' ) );
        ( new Element( 'h3.name' ) ).set( 'text', user.get( 'name' ) ).inject( $user );
        ( new Element( 'a.delete[data-method="delete"][text="delete"]' ) ).inject( $user );
      }
    });
    }).apply( typeof exports == 'undefined' ? this : global );


Ok now, we have a central point to manage selectors, within the "selectors" view option.
Each one can be get with the view .get() method. view.get( 'userList' ) will request for
the #users element.

The simplest form, as the first selector, will get the element once and cache it. If the
selector is more complex, it needs to be an object rather than a string. In this case,
the 'sel' key hold the actual selector.

If you don't want to cache the result, set cache: false.

If you want to use getElements rather than getElement, set multiple: true

If you want to search within an other selector rather than this.$element, use within and
give the name of that other selector.

When a result is cached, it is refered as this.$<selector name>, so the search selector
become this.$search. This also means that, if you want to, you can view.get( 'element' ),
or manually set any '$' prefixed instance variable and then get() it.

You may also want to use true getter methods. No problem, create a method named after
the selector name, so 'search' ask for 'getSearch'. Don't forget that this method return
will still be cached (and used next time) if you do not set cache: false.

Here is the stack of the resolution of a selector :

* use the cached element if any and cache is set to true (default)
* use the method named after the selector name
* use the sel key ( or the value of the selector if it's a string )

You are recommanded to use an option selector, even if you want a getter method. You may
not know if it would become a simpler selector or not in the future, and your controller
should not have to be aware if the selector is a simple one or a method. view.get('search')
will always work wether you just want to get '#search' or have complex logic behind.


### Model

Model is probably the most difficult part, because it heavyly rely on the server side
app design. Still, there are things we repeat again and again here too, putting args
in a hash to user toQueryString, sending request and firing callabacks upon completion.

As others, I choosed to start from a rails api kind, using resources, but I put a lot of
overidable methods so you may custom your model (or a Framwork.Model subclass aiming to
be model parent) to your need.

Here is the simplest model example :

    (function(){
    this.User = new Class({ 
      Extends: Framework.Model,

      options: {
        base_url: '/users/'
      }
    });
    }).apply( typeof exports == 'undefined' ? this : global );

It means that you have a classic user rails resource. You can now do :

    var user;
    user = new User({ first_name: 'test', last_name: 'user', bio: "I'm a test user" });
    user.save( function( user ){ console.log( 'saved!' ); }); // save the user and alert about it
    console.log( user.get( 'first_name' ) ); // => test

    user.set( 'first_name', 'for_real' );
    user.save( function( user ){ console.log( user.get( 'first_name' ) ); }); // => for_real

    // once save
    user = User.find( 1, function( user ){ console.log( user.get( 'id' ) ); }); // => 1

    user.update_attribute( 'first_name', 'test' ); // save straight, without callback
    user.update_attributes({ 'last_name': 'admin', 'bio': "I'm an overlord" }); // save straight, without callback

    user.destroy( function( user ){ console.log( 'deleted' ); }); // delete the user

    User.find_all({ first_name: 'test' }, function( users ){ console.log( users ); }); // get all users whose first name is "test"
    User.create({ first_name: 'test', last_name: 'user2', bio: "I'm an other test user" }, function( user ){ console.log( user ); });


Ok, but what if you do not work with a resource-like restful api? No problem, the Model class
provide a deep level of overidability. First, you can custom every request path and http verb.
The recognize requests are : find, find_all, create, update and destroy. But you do not have
to use all if you do not need to. For example, if you want to commit to a singleton resource
that take params and return values, without any id consideration, you may use only find and
create (create is used as soon as there is no id when saving, else update is used).

Example: 

    (function(){
    this.User = new Class({ 
      Extends: Framework.Model,

      options: {
        base_url: '/users/',
        find: {
          path: 'preference.json',
          method: 'post'
        },

        create: {
          path: 'save_preference.json',
          method: 'post'
        }
      }
    });
    }).apply( typeof exports == 'undefined' ? this : global );


Each request also as its own variant of :

* compute_<request>_url => method that return the url on which to send the request
* compute_<request>_params => method use to compute request parameters
* build_from_<request> => method that instantiate model from a find / find_all / create request
* <request>ed => called when request is completed (call the passed callback, by default)
* before_<request> => called before sending the request
* after_<request> => called after sending the request

