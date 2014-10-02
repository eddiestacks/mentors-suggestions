(function() {

  var Lexer = require('lexer.js');

  return {

    // SET GLOBALS
    aboutFieldID: '',

    // SET APP DEFAULTS
    defaultState: 'loading',
    defaultNumberOfEntriesToDisplay: 5,

    events: {
      // APP EVENTS
      'app.activated': 'init',
      'ticket.subject.changed': _.debounce(function() {
        this.init();
      }, 500), // Rerun the search if the subject changes
      'ticket.custom_field_{{About Field ID}}.changed': _.debounce(function() {
        this.init();
      }, 500), // Rerun the search if the About field changes

      // AJAX EVENTS
      'runTicketSearch.done': 'displayResults',
      'runTicketSearch.fail': 'displayError',

      // DOM EVENTS
      'click .toggle-app': 'toggleAppContainer',
      'click .btn-search': 'manualSearch',
      'click .btn-ticketSuggestions': function() {
        if (this.$('.btn-ticketSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
          this.init();
        }
      },
      'click .btn-answerSuggestions': function() {
        if (this.$('.btn-answerSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
        }
      }

    },

    requests: {
      runTicketSearch: function(query, aboutField) {
        // if About Field is empty, leave it out of the search.
        var searchQuery = query + ' type:ticket ' + (!_.isEmpty(aboutField) ? 'fieldvalue:' + this.aboutFieldContents : '');
        console.log('searchQuery ', searchQuery);
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@', searchQuery),
          type: 'GET'
        };
      }
    },
    activated: function(app){
      if (app.firstLoad)
        // Get the ID for the About Field, store its contents, and declare necessary variables
        this.aboutFieldID = 'custom_field_' + this.setting('About Field ID');
        this.aboutFieldContents = this.ticket().customField(this.aboutFieldID);
        return this.initialize();
    },
    init: function() {
      // Call algorithm to analyze keywords and return 5 results
      // Search for tickets in the current about field with the extracted keywords
      this.ajax('runTicketSearch', Lexer.extractKeywords(5, this).join(' '), this.aboutFieldContents);
    },
    search: function(query) {
      this.switchTo('spinner');
      if (this.$('btn-ticketSuggestions').hasClass('active')) {
        this.ajax('runTicketSearch', query);
      } else {
        if (this.setting('search_hc')) {
          this.ajax('searchHelpCenter', query);
        } else {
          this.ajax('searchWebPortal', query);
        }
      };

    },
    displayResults: function(data) {
      var resultList = [],
        resCount = data.count,
        resTicketID,
        resTicketSubject;

      // Loop through results and prep them for display
      for (var resultIndex = 0; resultIndex < this.defaultNumberOfEntriesToDisplay && resultIndex < resCount; resultIndex++) {

        // Set result Ticket ID to resTicketID, and result Ticket Subject to resTicketSubject
        resTicketID = data.results[resultIndex].id;
        resTicketSubject = data.results[resultIndex].subject;

        // Test if result is not current ticket being viewed, and if not, add it to resultList array
        if (this.ticket().id() != data.results[resultIndex].id) {
          resultList.push({
            'title': resTicketSubject,
            'link': '/agent/#/tickets/' + resTicketID
          });
        }
      }

      this.switchTo('ticketSuggestions', {
        resultList: resultList,
        aboutFilter: this.aboutFieldContents
      });
      // If zero results were returned, display message
      if (resultList.length === 0) {
        this.$('.no-results').show();
      } else {
        this.$('.no-results').hide();
      }
    },

    manualSearch: function() {
      this.manualSearchQuery = this.$('input.manualSearch').val().trim();
      this.ajax('runTicketSearch', this.manualSearchQuery, this.aboutFieldContents);
    },

    displayError: function(data) {
      console.log("there was an error");
      console.log(data);
    },

    toggleAppContainer: function() {
      var $container = this.$('.app-container'),
        $icon = this.$('.toggle-app i');

      if ($container.is(':visible')) {
        $container.hide();
        $icon.prop('class', 'icon-plus');
      } else {
        $container.show();
        $icon.prop('class', 'icon-minus');
      }
    }


  };
}());