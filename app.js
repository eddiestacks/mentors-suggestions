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
      'app.activated': 'activated',

      'ticket.subject.changed': _.debounce(function() {
        this.initialize();
      }, 500), // Rerun the search if the subject changes

      'ticket.custom_field_{{About Field ID}}.changed': _.debounce(function() {
        this.aboutFieldContents = this.ticket().customField(this.aboutFieldID);
        if (this.ticketMode()) {
          this.search()
        };
      }, 500), // Rerun the search if the About field changes

      // AJAX EVENTS
      'runTicketSearch.done': 'displayResults',
      'runTicketSearch.fail': 'displayError',
      'searchHelpCenter.done': 'searchHelpCenterDone',
      'searchWebPortal.done': 'searchWebPortalDone',
      'getHcArticle.done': 'getHcArticleDone',
      'settings.done': 'settingsDone',

      // DOM EVENTS
      'click .toggle-app': 'toggleAppContainer',
      'click .btn-search': 'manualSearch',
      'click .btn-ticketSuggestions': function() {
        if (this.$('.btn-ticketSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
          this.search();
        }
      },
      'click .btn-answerSuggestions': function() {
        if (this.$('.btn-answerSuggestions').hasClass('active') !== true) {
          this.$('.app-btn').toggleClass('active');
          this.switchTo(this.defaultState);
          this.initialize();
        }
      },
      // Answer suggestion app DOM Events
      'click a.main.preview_link': 'previewLink',
      'dragend,click a.copy_link': 'copyLink',
      'dragend a.main': 'copyLink',
      'keyup input.manualSearch': function(event) {
        if (event.keyCode === 13)
          return this.manualSearch();
      },


    },

    requests: {
      settings: {
        url: '/api/v2/account/settings.json',
        type: 'GET'
      },

      runTicketSearch: function(query, aboutField) {
        // if About Field is empty, leave it out of the search.
        var searchQuery = query + ' type:ticket ' + (!_.isEmpty(aboutField) ? 'fieldvalue:' + this.aboutFieldContents : '');
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@', searchQuery),
          type: 'GET'
        };
      },

      getHcArticle: function(id) {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@.json?include=translations,sections', id),
          type: 'GET'
        };
      },

      searchHelpCenter: function(query) {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/search.json?per_page=%@&query=%@', this.queryLimit(), query),
          type: 'GET'
        };
      },

      searchWebPortal: function(query) {
        return {
          url: helpers.fmt('/api/v2/search.json?per_page=%@&query=%@ type:topic', this.queryLimit(), query),
          type: 'GET'
        };
      },

      fetchTopicsWithForums: function(ids) {
        return {
          url: helpers.fmt('/api/v2/topics/show_many.json?ids=%@&include=forums', ids.join(',')),
          type: 'POST'
        };
      }
    },

    activated: function(app) {
      if (app.firstLoad) { 
          this.initialize
      }
    },

    initialize: function() {
      // if (_.isEmpty(this.ticket().subject()))
      //   return this.switchTo('no_subject');
      if (this.ticketMode()
        // Get the ID for the About Field, store its contents, and declare necessary variables) {
        this.aboutFieldID = 'custom_field_' + this.setting('About Field ID');
        this.aboutFieldContents = this.ticket().customField(this.aboutFieldID);
        return this.search();
      } else {
        this.ajax('settings').then(function() {
          this.search();
        }.bind(this));
      }
    },


    search: function(query) {
      this.switchTo('loading');
      var search_query = query || Lexer.extractKeywords(4, this).join(' ');
      console.log('search_query ', search_query);

      if (this.$('.btn-ticketSuggestions').hasClass('active')) {
        this.ajax('runTicketSearch', search_query, this.aboutFieldContents);
      } else {
        if (this.setting('search_hc')) {
          this.ajax('searchHelpCenter', search_query);
        } else {
          this.ajax('searchWebPortal', search_query);
        }
      };

    },
    ticketMode: function() {
      return this.$('.btn-ticketSuggestions').hasClass('active') == true;
    },
    displayResults: function(data) {
      if (this.ticketMode()) {
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
      }
    },

    manualSearch: function() {
      this.search(this.$('input.manualSearch').val().trim());
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
    },

    // Answer Suggestion app 
    // #####################
    queryLimit: function() {
      // ugly hack to return more results than needed because we filter out agent only content
      if (this.setting('exclude_agent_only') && !this.setting('search_hc')) {
        return this.numberOfDisplayableEntries() * 2;
      } else {
        return this.numberOfDisplayableEntries();
      }
    },

    numberOfDisplayableEntries: function() {
      return this.setting('nb_entries') || this.defaultNumberOfEntriesToDisplay;
    },

    renderAgentOnlyAlert: function() {
      var alert = this.renderTemplate('alert');
      this.$('#detailsModal .modal-body').prepend(alert);
    },

    isAgentOnlyContent: function(data) {
      return data.sections && data.sections[0].visibility == 'internal' || data.agent_only;
    },

    settingsDone: function(data) {
      this.useMarkdown = data.settings.tickets.markdown_ticket_comments;
    },

    getHcArticleDone: function(data) {
      var html = this.hcArticleLocaleContent(data);
      this.$('#detailsModal .modal-body .content-body').html(html);
      if (this.isAgentOnlyContent(data)) {
        this.renderAgentOnlyAlert();
      }
    },

    searchHelpCenterDone: function(data) {
      if (!this.ticketMode()) {
        this.renderList(this.formatHcEntries(data.results));
      }
    },

    searchWebPortalDone: function(data) {
      if (!this.ticketMode()) {
        if (_.isEmpty(data.results))
          return this.switchTo('no_entries');

        var topics = data.results,
          topicIds = _.map(topics, function(topic) {
            return topic.id;
          });

        this.ajax('fetchTopicsWithForums', topicIds)
          .done(function(data) {
            var entries = this.formatEntries(topics, data);
            this.store('entries', entries);
            this.renderList(entries);
          });
      }
    },

    renderList: function(data) {
      if (_.isEmpty(data.entries)) {
        return this.switchTo('no_entries');
      } else {
        this.switchTo('list', data);
      }
    },

    formatEntries: function(topics, result) {
      var entries = _.inject(topics, function(memo, topic) {
        var forum = _.find(result.forums, function(f) {
          return f.id == topic.forum_id;
        });
        var entry = {
          id: topic.id,
          url: helpers.fmt("%@entries/%@", this.baseUrl(), topic.id),
          title: topic.title,
          body: topic.body,
          agent_only: !!forum.access.match("agents only")
        };

        if (!(this.setting('exclude_agent_only') && entry.agent_only)) {
          memo.push(entry);
        }

        return memo;
      }, [], this);

      return {
        entries: entries.slice(0, this.numberOfDisplayableEntries())
      };
    },

    formatHcEntries: function(result) {
      var slicedResult = result.slice(0, this.numberOfDisplayableEntries());
      var entries = _.inject(slicedResult, function(memo, entry) {
        var title = entry.name;
        var url = entry.html_url.replace(/^https:\/\/.*.zendesk(-staging|-gamma)?.com\//, this.baseUrl());

        memo.push({
          id: entry.id,
          url: url,
          title: title
        });
        return memo;
      }, [], this);

      return {
        entries: entries
      };
    },

    baseUrl: function() {
      if (this.setting('custom_host')) {
        var host = this.setting('custom_host');
        if (host[host.length - 1] !== '/') {
          host += '/';
        }
        return host;
      }
      return helpers.fmt("https://%@.zendesk.com/", this.currentAccount().subdomain());
    },

    previewLink: function(event) {
      event.preventDefault();
      var $link = this.$(event.target).closest('a');
      $link.parent().parent().parent().removeClass('open');
      var $modal = this.$("#detailsModal");
      $modal.html(this.renderTemplate('modal', {
        title: $link.attr('title'),
        link: $link.attr('href')
      }));
      $modal.modal();
      this.getContentFor($link.attr('data-id'));
    },

    copyLink: function(event) {
      event.preventDefault();
      var content = "";

      if (this.useMarkdown) {
        var title = event.target.title;
        var link = event.target.href;
        content = helpers.fmt("[%@](%@)", title, link);
      } else {
        if (this.setting('include_title')) {
          content = event.target.title + ' - ';
        }
        content += event.currentTarget.href;
      }
      return this.appendToComment(content);
    },

    renderTopicContent: function(id) {
      var topic = _.find(this.store('entries').entries, function(entry) {
        return entry.id == id;
      });
      this.$('#detailsModal .modal-body .content-body').html(topic.body);
      if (this.isAgentOnlyContent(topic)) {
        this.renderAgentOnlyAlert();
      }
    },

    getContentFor: function(id) {
      if (this.setting('search_hc')) {
        this.ajax('getHcArticle', id);
      } else {
        this.renderTopicContent(id);
      }
    },

    appendToComment: function(text) {
      var old_text = _.isEmpty(this.comment().text()) ? '' : this.comment().text() + '\n';
      return this.comment().text(old_text + text);
    },

    stop_words: _.memoize(function() {
      return _.map(this.I18n.t("stop_words").split(','), function(word) {
        return word.trim();
      });
    }),

    numberOfDisplayableEntries: function() {
      return this.setting('nb_entries') || this.defaultNumberOfEntriesToDisplay;
    },

  };
}());