(function() {

  var Lexer = require('lexer.js');
  return {
    defaultState: 'scaffolding',

    events: {
      'app.activated': 'doSomething'
    },

    doSomething: function() {
      this.extractKeywords();
    },

    extractKeywords: function() {
      
      var description = this.ticket().description();
      var title = this.ticket().subject();

      //todo: add to the list of excluding common words in zendesk domain (e.g. question,help) 
      var exclusions = this.I18n.t('stopwords.exclusions').split(',');
      
      console.log("pseudoTitle = ");
      var pseudoTitle = Lexer.pseudoPhrase(title, exclusions);
      console.log(pseudoTitle);

      console.log("pseudoDescription = ");
      var pseudoDescription = Lexer.pseudoPhrase(description, exclusions);
      console.log(pseudoDescription);
      
      // combine the title and description to get a list of unique keywords
      console.log("union of keywords from subject and description: ");
      var unionKeywords = _.union(pseudoTitle,pseudoDescription);
      console.log(unionKeywords);


    },

    getKeywords: function() {
      var wordsArray = [];
      var keyArray = [];
      var countArray = [];
      var words = this.ticket().description().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").split(' ');
      var title = this.ticket().subject().toLowerCase().replace(/[\.,-\/#!$?%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").split(' ');
      //words = words.concat(title);
      var exclusions = this.I18n.t('stopwords.exclusions').split(',');
      var keywords = _.difference(words, exclusions);
      title = _.difference(title, exclusions);
      for (var x = 0; x < keywords.length; x++) {
        var index = wordsArray.indexOf(keywords[x]);
        if (index < 0) {
          keyArray.push({
            'word': keywords[x],
            'count': 1
          });
          wordsArray.push(keywords[x]);
          countArray.push(1);
        } else {
          keyArray[index].count += 1;
          countArray[index] += 1;
        }
      }

      countArray.sort();

      //console.log(countArray);

      //console.log(keyArray);
      var priorityWords = [];
      while (countArray.length > 0) {
        var nextHighest = countArray.pop();
        for (var j = 0; j < keyArray.length; j++) {
          if (keyArray[j].count == nextHighest) {
            priorityWords.push(keyArray.splice(j, 1)[0]);
            break;
          }
        }
      }
      wordsArray = [];
      for (var x = 0; x < title.length; x++) {
        var index = wordsArray.indexOf(title[x]);
        if (index < 0) {
          keyArray.push({
            'word': title[x],
            'count': 1
          });
          wordsArray.push(title[x]);
          countArray.push(1);
        } else {
          keyArray[index].count += 1;
          countArray[index] += 1;
        }
      }

      var titlePriorityWords = [];
      while (countArray.length > 0) {
        var nextHighest = countArray.pop();
        for (var j = 0; j < keyArray.length; j++) {
          if (keyArray[j].count == nextHighest) {
            titlePriorityWords.push(keyArray.splice(j, 1)[0]);
            break;
          }
        }
      }

      var searchTerms = [];

      for (var x = 0; x < titlePriorityWords.length; x++) {
        if (x < 5) {
          searchTerms.push(titlePriorityWords[x].word);
        } else {
          break;
        }
      }

      var keysAdded = 0;

      for (var x = 0; x < priorityWords.length; x++) {
        if (keysAdded <= 5) {
          if (searchTerms.indexOf(priorityWords[x].word) == -1) {
            searchTerms.push(priorityWords[x].word);
            keysAdded++;
          }
        } else {
          break;
        }
      }

      var searchTermString = "";

      for (var x = 0; x < searchTerms.length; x++) {
        if (searchTermString != "") {
          searchTermString += " ";
        }
        searchTermString += searchTerms[x];
      }

      return searchTermString;
    }

  };

}());
