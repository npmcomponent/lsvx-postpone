"use strict";

/** Expose `Postpone`. */
module.exports = Postpone;

/**
 * Creates a new Postpone instance.
 * @constructor
 */
function Postpone() {
    if ( !( this instanceof Postpone ) ) return new Postpone();

    /**
     * The init method for Postpone gets the object running. It runs
     * postpone.postpone() to attach scroll event handlers and check if any
     * elements are already visible. Then, init will start the watch process.
     * @returns this
     */
    this.init = function() {
        /**
         * @property {string} tags - A list of all the tags for which postpone
         * will work;
         */
        this.tags = "audio, embed, iframe, img, image, picture, use, video, tref";

        this.getElements();
        this.getScrollElements();

        /**
         * If any of the postponed elements should be visible to begin with,
         * then load them.
         */
        for ( var id in this.scrollElements ) {
            for ( var i = 0, element = {}; i < this.scrollElements[ id ].length; i++ ) {
                element = this.scrollElements[ id ][ i ];
                if ( this.isVisible( element, this.scrollElements[ id ].element ) ) {
                    this.load( element );
                }
            }
        }

        this.postpone();

        /** Call method to start looking for postponed media. */
        return this.start();
    };

    return this.init();
}

/**
 * The main postpone method. This method iterates over all the elements with
 * a `postpone` attribute and links them to a scroll event so that they are not
 * loaded until they become visible.
 * @returns this
 */
Postpone.prototype.postpone = function() {
    var id = "";

    /**
     * Remove any previous event handlers so they can be reattached for new
     * postponed elements without duplicating old ones.
     */
    for ( id in this.scrollElements ) {
        if ( id === "window" ) {
            window.removeEventListener( "scroll", this.scrollElements[ id ].callback );
        } else {
            this.scrollElements[ id ].element.removeEventListener( "scroll", this.scrollElements[ id ].callback );
        }
    }

    if ( this.elements.length ) {
        this.getElements();
        this.getScrollElements();

        /** Attach scroll event listeners. */
        for ( id in this.scrollElements ) {
            this.scrollElements[ id ].callback = this.scrollHandler.bind( this );
            if ( id === "window" ) {
                window.addEventListener( "scroll", this.scrollElements[ id ].callback );
            } else {
                this.scrollElements[ id ].element.addEventListener( "scroll", this.scrollElements[ id ].callback );
            }
        }
    }
    return this;
};

/**
 * A helper method to find all of the elements with a postponed attribute.
 * @returns {array} An array of nodes with a `truthy` postpone attribute.
 */
Postpone.prototype.getElements = function() {
    var elements = [],
        matches = Array.prototype.slice.call( document.querySelectorAll( this.tags ) ),
        postpone = null;

    for ( var i = 0; i < matches.length; i++ ) {
        postpone = matches[ i ].getAttribute( "postpone" );
        if ( typeof postpone === "string" && postpone !== "false" ) {
            elements.push( matches[ i ] );
        }
    }

    /**
     * @property {array} elements - An array of all the postponed elements in the document.
     */
    return this.elements = elements;
};

/**
 * A helper method to find all of the elements with respect to which postponed
 * elements scroll. The elements are stored with a unique ID as a their key.
 * @returns {object} A hash with arrays of postponed elements associated with
 * IDs of their scroll elements.
 */
Postpone.prototype.getScrollElements = function() {
    /**
     * @property {object} scrollElements - A variable to keep track of the
     * elements with respoect to which the postponed elements scroll.
     */
    this.scrollElements = {};

    var id = "",
        element = {},
        scrollElement = {};

    for ( var i = 0; i < this.elements.length; i++ ) {
        element = this.elements[ i ];
        /**
         * Find the element relative to which the postponed element's
         * position should be calculated.
         */
        if ( element.getAttribute( "data-scroll-element" ) ) {
            scrollElement = document.querySelector( element.getAttribute( "data-scroll-element" ) );
            /**
             * If the scroll element does not have an ID, generate one and
             * assign it as a data attribute.
             */
            id = scrollElement.getAttribute( "data-id" );
            if ( !id ) {
                scrollElement.setAttribute( "data-id", id = new Date().getTime() );
            }
        /**
         * If the element does not have a scroll element specified then
         * assume its position should be calculated relative to the window.
         */
        } else {
            scrollElement = "window";
            id = "window";
        }
        /**
         * If the array already has this id as a key, then add the current
         * element to the array in its value, otherwise create a new key.
         */
        if ( this.scrollElements[ id ] ) {
            this.scrollElements[ id ].push( element );
        } else {
            this.scrollElements[ id ] = [ element ];
            this.scrollElements[ id ].element = scrollElement;
        }
    }

};

/**
 * A small helper that finds the posponed elements and returns them in a
 * string.
 * @param {array} elements - An array of elements to stringify.
 * @returns {string} A string containing all the HTML of postponed elements.
 */
Postpone.prototype.stringifyElements = function( elements ) {
    var elementsString = "";

    for ( var i = 0; i < elements.length; i++ ) {
        elementsString += elements[ i ].outerHTML;
    }

    return elementsString;
};

/**
 * Method to watch the document for new postponed elements.
 * @param {string} [elementsString] - A string of postponed elements.
 * @returns this
 */
Postpone.prototype.watch = function( elementsString ) {
    /** Refresh the array of postponed elements, this.elements. */
    this.getElements();
    var newElementsString = this.stringifyElements( this.elements );
    /** If the postponed elements have changed, then postpone them. */
    if ( elementsString && elementsString !== newElementsString ) {
        this.postpone();
    }
    /**
     * This timeout calls the watch method every 500ms. In other words,
     * postpone will look for new postponed elements twice a second.
     * @property {number} timeout - The ID for the current timeout.
     */
    this.timeout = window.setTimeout( (function( _this ) {
        return function() {
            return _this.watch( newElementsString );
        };
    })( this ), 500);

    return this;
};

/**
 * Method to start watching for elements that should postponed.
 * @returns this
 */
Postpone.prototype.start = function() {
    /** Ensure that watching has stopped before starting to watch. */
    if ( this.timeout ) this.stop();
    /** Start watching. */
    this.watch();

    return this;
};

/**
 * Method to stop watching for elements that should postponed.
 * @returns this
 */
Postpone.prototype.stop = function() {
    if ( this.timeout ) window.clearTimeout( this.timeout );

    return this;
};

/**
 * This method defines the scroll event handler used to test if postponed
 * elementes are visible.
 * @param {object} e - Event object.
 * @returns this
 */
Postpone.prototype.scrollHandler = function( e ) {
    var scrollElement = e.srcElement,
        elements = this.scrollElements[ scrollElement === window.document ? scrollElement = "window" : scrollElement.getAttribute( "data-id" ) ],
        element = {},
        scrolledIntoView = false;

    for ( var i = 0; i < elements.length; i++ ) {
        element = elements[ i ];

        /**
         * If an element is visible then we no longer need to postpone it
         * and can download it.
         */
        if ( this.isVisible( element, scrollElement ) ) {
           this.load( element );
        }
    }

    return this;
};

/**
 * Small helper method to find the total vertical offset of an element.
 * @param {object} el - The element we wish to locate.
 * @returns {number} The total vertical offset of the element.
 */
Postpone.prototype.offsetTop = function( el ) {
    var temp = el,
        o = 0;
    /** Iterate over all parents of el up to body to find the vertical offset. */
    while ( temp && temp.tagName.toLowerCase() !== "body" ) {
        o += temp.offsetTop;
        temp = temp.offsetParent;
    }

    return o;
};

/**
 * Helper method to determine if an element is visible.
 * @param {object} el - The element we wish to test.
 * @param {object} scrollElement - The element with respect to which `el` scrolls.
 * @returns {boolean} Return true if the `el` is visible and false if it is not.
 */
Postpone.prototype.isVisible = function( el, scrollElement ) {
    /** If no scroll element is specified, then assume the scroll element is the window. */
    scrollElement = scrollElement? scrollElement : "window";

    if ( scrollElement === "window" )  scrollElement = document.body;
    /** Use clientHeight instead of window.innerHeight for compatability with ie8. */
    var viewPortHeight = document.documentElement.clientHeight,
        top = this.offsetTop( el ),
        scrollHeight = scrollElement.scrollTop + this.offsetTop( scrollElement );

    return viewPortHeight + scrollHeight >= top;
};

/**
 * This method takes care of loading the media that should no longer be
 * postponed.
 * @param {object} el - The element that should be loaded.
 * @returns {object} The element that was loaded.
 */
Postpone.prototype.load = function( el ) {
    var child = {},
        i = 0;
    el.removeAttribute( "postpone" );

    /** If the element has a `data-src` attribute then copy it to `src`. */
    if ( ~"audio, embed, iframe, img, picture, video".indexOf( el.tagName.toLowerCase() ) && el.getAttribute( "data-src" ) ) {
        el.setAttribute( "src", el.getAttribute( "data-src" ) );
    }

    if ( ~"image, tref, use".indexOf( el.tagName.toLowerCase() )  && el.getAttribute( "data-xlink:href" ) ) {
        el.setAttribute( "xlink:href", el.getAttribute( "data-xlink:href" ) );
    }

    else if ( ~"audio, video".indexOf( el.tagName.toLowerCase() ) && el.children.length ) {
        for ( i = 0; i <= el.children.length; i++ ) {
            child = el.children[ i ];
            if ( child.tagName.toLowerCase() === "source" && child.getAttribute( "data-src" ) ) {
                child.setAttribute( "src", child.getAttribute( "data-src" ) );
            }
        }
    }

    else if ( el.tagName.toLowerCase() === "picture" && el.children.length ) {
        for ( i = 0; i <= el.children.length; i++ ) {
            child = el.children[ i ];
            if ( child.tagName.toLowerCase() === "source" ) {
                if ( child.getAttribute( "data-src" ) ) {
                    child.setAttribute( "src", child.getAttribute( "data-src" ) );
                }
                if ( child.getAttribute( "data-srcset" ) ) {
                    child.setAttribute( "srcset", child.getAttribute( "data-srcset" ) );
                }
            }
        }
    }

    return el;
};
