(function() {

  var Lexer = require('lexer.js');

  return {

    defaultState: 'spinner',
    defaultNumberOfEntriesToDisplay: 10,

    // SET GLOBALS
    aboutFieldID: '',

    // SET APP DEFAULTS
    defaultState: 'loading',
    defaultNumberOfEntriesToDisplay: 5,

    // APP EVENTS
    events: {
      'app.activated' : 'init',
      'ticket.subject.changed' : _.debounce(function(){ this.init(); }, 500), // Rerun the search if the subject changes
      'ticket.custom_field_{{About Field ID}}.changed' : _.debounce(function(){ this.init(); }, 500), // Rerun the search if the About field changes
      'runTicketSearch.done' : 'displayResults',
      'runTicketSearch.fail' : 'displayError',
      'click .btn-search': 'manualSearch',
      'click .btn-ticketSuggestion' : function() { this.$('.btn-ticketSuggestion').toggle('.active'); init();},
      'click .btn-answerSuggestions' : 'activated',

      // AJAX EVENTS
      'searchHelpCenter.done': 'searchHelpCenterDone',
      'searchWebPortal.done': 'searchWebPortalDone',
      'getHcArticle.done': 'getHcArticleDone',
      'settings.done': 'settingsDone',

      // DOM EVENTS
      'click a.preview_link': 'previewLink',
      'dragend,click a.copy_link': 'copyLink',
      'dragend a.main': 'copyLink',
      'click .toggle-app': 'toggleAppContainer',
      'keyup .custom-search input': function(event){
        if(event.keyCode === 13)
          return this.processSearchFromInput();
      }

    },

    requests: {
      runTicketSearch: function(query, aboutField) {
        // if About Field is empty, leave it out of the search.
        var searchQuery = query + ' type:ticket ' + (!_.isEmpty(aboutField) ? 'fieldvalue:' + this.aboutFieldContents : '')
        console.log('searchQuery ' , searchQuery);
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@', searchQuery),
          type: 'GET'
        };
      },
      settings: {
        url: '/api/v2/account/settings.json',
        type: 'GET'
      }
    },
  
    init: function() {
      // Get the ID for the About Field, store its contents, and declare necessary variables
      this.aboutFieldID = 'custom_field_' + this.setting('About Field ID');
      this.aboutFieldContents = this.ticket().customField(this.aboutFieldID);

      // Call algorithm to analyze keywords and return 5 results
      var keywords = Lexer.extractKeywords(5, this);

      // Search for tickets in the current about field with the extracted keywords
      this.ajax('runTicketSearch', keywords.join(' '), this.aboutFieldContents);
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
        if ( this.ticket().id() != data.results[resultIndex].id) {
          resultList.push({'title':resTicketSubject, 'link': '/agent/#/tickets/' + resTicketID});
        }
      }

      this.switchTo('ticketSuggestion', {resultList: resultList, aboutFilter: this.aboutFieldContents});
      // If zero results were returned, display message
      if (resultList.length === 0) {
        this.$('.no-results').show();
      } else {
        this.$('.no-results').hide();
      }
    },

    manualSearch: function() {
      var manualSearchQuery = this.$('input.manualSearch').val().trim();
      this.ajax('runTicketSearch', manualSearchQuery, this.aboutFieldContents);
    },

    displayError: function(data) {
      console.log("there was an error");
      console.log(data);
    },

      getHcArticle: function(id) {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@.json?include=translations,sections', id),
          type: 'GET'
        };
      },

      searchHelpCenter: function(query){
        return {
          url: helpers.fmt('/api/v2/help_center/articles/search.json?per_page=%@&query=%@', this.queryLimit(), query),
          type: 'GET'
        };
      },

      searchWebPortal: function(query){
        return {
          url: helpers.fmt('/api/v2/search.json?per_page=%@&query=%@ type:topic', this.queryLimit(), query),
          type: 'GET'
        };
      },

      fetchTopicsWithForums: function(ids){
        return {
          url: helpers.fmt('/api/v2/topics/show_many.json?ids=%@&include=forums', ids.join(',')),
          type: 'POST'
        };
      },

    search: function(query) {
      console.log('answer_fired');
      this.switchTo('spinner');

      if (this.setting('search_hc')) {
        this.ajax('searchHelpCenter', query);
      } else {
        this.ajax('searchWebPortal', query);
      }
    },

    activated: function(app){
      if (app.firstLoad)
        return this.switchTo('answerlayout');
      this.initialize();
    },

    initialize: function(){
      console.log('answer_fired');
      if (_.isEmpty(this.ticket().subject()))
        return this.switchTo('no_subject');
      this.ajax('settings').then(function() {
        this.search(this.subjectSearchQuery());
      }.bind(this));
    },

    settingsDone: function(data) {
      console.log('answer_fired');
      this.useMarkdown = data.settings.tickets.markdown_ticket_comments;
    },

    hcArticleLocaleContent: function(data) {
      console.log('answer_fired');
      var currentLocale = this.currentUser().locale(),
          translations = data.article.translations;

      var localizedTranslation = _.find(translations, function(translation) {
        return translation.locale.toLowerCase() === currentLocale.toLowerCase();
      });

      return localizedTranslation && localizedTranslation.body || translations[0].body;
    },

    renderAgentOnlyAlert: function() {
      console.log('answer_fired');
      var alert = this.renderTemplate('alert');
      this.$('#detailsModal .modal-body').prepend(alert);
    },

    isAgentOnlyContent: function(data) {
      console.log('answer_fired');
       return data.sections && data.sections[0].visibility == 'internal' || data.agent_only;
    },

    getHcArticleDone: function(data) {
      console.log('answer_fired');
      var html = this.hcArticleLocaleContent(data);
      this.$('#detailsModal .modal-body .content-body').html(html);
      if (this.isAgentOnlyContent(data)) { this.renderAgentOnlyAlert(); }
    },

    searchHelpCenterDone: function(data){
      console.log('answer_fired');
      this.renderList(this.formatHcEntries(data.results));
    },

    searchWebPortalDone: function(data){
      console.log('answer_fired');
      if (_.isEmpty(data.results))
        return this.switchTo('no_entries');

      var topics = data.results,
          topicIds = _.map(topics, function(topic) { return topic.id; });

      this.ajax('fetchTopicsWithForums', topicIds)
        .done(function(data){
          var entries = this.formatEntries(topics, data);
          this.store('entries', entries);
          this.renderList(entries);
        });
    },

    renderList: function(data){
      console.log('answer_fired');
      if (_.isEmpty(data.entries)) {
        return this.switchTo('no_entries');
      } else {
        this.switchTo('list', data);
      }
    },

    formatEntries: function(topics, result){
      console.log('answer_fired');
      var entries = _.inject(topics, function(memo, topic){
        var forum = _.find(result.forums, function(f){ return f.id == topic.forum_id; });
        var entry = {
          id: topic.id,
          url: helpers.fmt("%@entries/%@", this.baseUrl(), topic.id),
          title: topic.title,
          body: topic.body,
          agent_only: !!forum.access.match("agents only")
        };

        if ( !(this.setting('exclude_agent_only') && entry.agent_only)){
          memo.push(entry);
        }

        return memo;
      }, [], this);

      return { entries: entries.slice(0,this.numberOfDisplayableEntries()) };
    },

    formatHcEntries: function(result){
      console.log('answer_fired');
      var slicedResult = result.slice(0, this.numberOfDisplayableEntries());
      var entries = _.inject(slicedResult, function(memo, entry){
        var title = entry.name;
        var url = entry.html_url.replace(/^https:\/\/.*.zendesk(-staging|-gamma)?.com\//, this.baseUrl());

        memo.push({
          id: entry.id,
          url: url,
          title: title
        });
        return memo;
      }, [], this);

      return { entries: entries };
    },

    processSearchFromInput: function(){
      console.log('answer_fired');
      var query = this.removePunctuation(this.$('.custom-search input').val());
      if (query && query.length) { this.search(query); }
    },

    baseUrl: function(){
      console.log('answer_fired');
      if (this.setting('custom_host')) {
        var host = this.setting('custom_host');
        if (host[host.length - 1] !== '/') { host += '/'; }
        return host;
      }
      return helpers.fmt("https://%@.zendesk.com/", this.currentAccount().subdomain());
    },

    previewLink: function(event){
      console.log('answer_fired');
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
      console.log('answer_fired');
      event.preventDefault();
      var content = "";

      if (this.useMarkdown) {
        var title = event.target.title;
        var link = event.target.href;
        content = helpers.fmt("[%@](%@)", title, link);
      }
      else {
        if (this.setting('include_title')) {
          content = event.target.title + ' - ';
        }
        content += event.currentTarget.href;
      }
      return this.appendToComment(content);
    },

    renderTopicContent: function(id) {
      console.log('answer_fired');
      var topic = _.find(this.store('entries').entries, function(entry) {
        return entry.id == id;
      });
      this.$('#detailsModal .modal-body .content-body').html(topic.body);
      if (this.isAgentOnlyContent(topic)) { this.renderAgentOnlyAlert(); }
    },

    getContentFor: function(id) {
      console.log('answer_fired');
      if (this.setting('search_hc')) {
        this.ajax('getHcArticle', id);
      } else {
        this.renderTopicContent(id);
      }
    },

    appendToComment: function(text){
      console.log('answer_fired');
      var old_text = _.isEmpty(this.comment().text()) ? '' : this.comment().text() + '\n';
      return this.comment().text( old_text + text);
    },

    stop_words: _.memoize(function(){
      return _.map(this.I18n.t("stop_words").split(','), function(word) { return word.trim(); });
    }),

    numberOfDisplayableEntries: function(){
      console.log('answer_fired');
      return this.setting('nb_entries') || this.defaultNumberOfEntriesToDisplay;
    },

    queryLimit: function(){
      console.log('answer_fired');
      // ugly hack to return more results than needed because we filter out agent only content
      if (this.setting('exclude_agent_only') && !this.setting('search_hc')) {
        return this.numberOfDisplayableEntries() * 2;
      } else {
        return this.numberOfDisplayableEntries();
      }
    },

    removeStopWords: function(str, stop_words){
      console.log('answer_fired');
      // Remove punctuation and trim
      str = this.removePunctuation(str);
      var words = str.match(/[^\s]+|\s+[^\s+]$/g);
      var x,y = 0;

      for(x=0; x < words.length; x++) {
        // For each word, check all the stop words
        for(y=0; y < stop_words.length; y++) {
          // Get the current word
          var word = words[x].replace(/\s+|[^a-z]+\'/ig, "");

          // Get the stop word
          var stop_word = stop_words[y];

          // If the word matches the stop word, remove it from the keywords
          if(word.toLowerCase() == stop_word) {
            // Build the regex
            var regex_str = "^\\s*"+stop_word+"\\s*$";// Only word
            regex_str += "|^\\s*"+stop_word+"\\s+";// First word
            regex_str += "|\\s+"+stop_word+"\\s*$";// Last word
            regex_str += "|\\s+"+stop_word+"\\s+";// Word somewhere in the middle

            var regex = new RegExp(regex_str, "ig");

            str = str.replace(regex, " ");
          }
        }
      }

      return str;
    },

    removePunctuation: function(str){
      console.log('answer_fired');
      return str.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g," ")
        .replace(/\s{2,}/g," ");
    },

    subjectSearchQuery: function(s){
      console.log('answer_fired');
      return this.removeStopWords(this.ticket().subject(), this.stop_words());
    },

    toggleAppContainer: function(){
      console.log('answer_fired');
      var $container = this.$('.app-container'),
      $icon = this.$('.toggle-app i');

      if ($container.is(':visible')){
        $container.hide();
        $icon.prop('class', 'icon-plus');
      } else {
        $container.show();
        $icon.prop('class', 'icon-minus');
      }
    }

  };
}());