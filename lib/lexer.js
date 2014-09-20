module.exports = {
  analyzePseudophrases: function(input, that) {
    if (input instanceof String) {
      console.log("Input must be String to convert pseudoPhrase");
      return false;
    }

    var tokenizedInput = this.tokenize(input);

    // Strip out stop words 
    //todo: (5) add to the list of excluding common words in zendesk domain (e.g. question,help) 
    var stopwords = that.I18n.t('stopwords.exclusions').split(',');
    var noStopwordInput = _.difference(tokenizedInput, stopwords);

    // Calculate the frequencies of each word and its stem
    var stemmedPseudophrases = this.stemmedFrequency(noStopwordInput);

    return stemmedPseudophrases;
  },
  tokenize: function(input) {
    // Lowercase the given input 
    var lcaseInput = input.toLowerCase();

    // detect and remove urls and emails
    var re_weburl = /(https?:\/\/|www.)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/g;
    var re_email = /[a-zA-Z0-9]+(?:(\.|_)[A-Za-z0-9!#$%&'*+\/=?^`{|}~-]+)*@(?!([a-zA-Z0-9]*\.[a-zA-Z0-9]*\.[a-zA-Z0-9]*\.))(?:[A-Za-z0-9](?:[a-zA-Z0-9-]*[A-Za-z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?/g;
    var noURLorEmail = lcaseInput.replace(re_weburl, " ").replace(re_email, " ");;

    // Remove some non-alphabetical characters (numbers and punctuation)
    // Strip the string of numbers and periods
    var noNumberInput = noURLorEmail.replace(/\d*\.\d+|\d+|(\.)/g, " ");
    // Strip punctuation (does not account for acronyms)
    var noPunctuationInput = noNumberInput.replace(/[\.,\/#!$?%\^&\*;:{}=\-`’"~()<>\[\]+]/g, " "); //.replace(/\./ig, "");

    // split string on whitespace to return an array of non-empty strings
    return _.filter(noPunctuationInput.split(/\s/), function(token) {
      return token.length > 0;
    });
  },
  stemmedFrequency: function(words) {
    return words.reduce(this.calcStemFrequency, []);
  },
  calcStemFrequency: function(stemmedWords, word, index, unstemmedWords) {
    var Stemmer = require('stemmer.js');
    var stemmedWord = Stemmer.stem(word);

    // Special case for when the stemmedWord list is empty
    if (stemmedWords.length == 0) {
      stemmedWords.push({
        stem: stemmedWord,
        stemmedFrequency: 1,
        originalTerms: [{
          term: word,
          frequency: 1
        }]
      });
    } else {

      // Check if stem already exists
      var stemmedObject = _.find(stemmedWords, function(stemObject) {
        return stemObject.stem == stemmedWord
      });

      if (!stemmedObject) { // stem doesn't exist in stemmedWords
        // add it to the list
        stemmedWords.push({
          stem: stemmedWord,
          stemmedFrequency: 1,
          originalTerms: [{
            term: word,
            frequency: 1
          }]
        });
      } else { // stem does exist

        stemmedObject.stemmedFrequency += 1; // increment stemmed frequency by 1 
        // check if original word exists
        var orig = _.find(stemmedObject.originalTerms, function(origTerm) {
          return origTerm.term == word;
        });

        if (orig) { //if original word already exists
          orig.frequency += 1; //increment frequency by 1
        } else {
          stemmedObject.originalTerms.push({ // add the original term to the list
            term: word,
            frequency: 1
          });
        }
      }
    }
    return stemmedWords;

  },
  analyzeTicket: function(context) {
    // Subject is doubled and combined with description
    var combinedTicketText = context.ticket().subject() + " " + context.ticket().subject() + " " + context.ticket().description();
    // Tokenize, Stem, and calculate frequencies
    var stemmedFrequencies = this.analyzePseudophrases(combinedTicketText, context);
    // Sort the stemmedResults by Stem Frequency
    var sorted = this.sortStems(stemmedFrequencies);
    return sorted;
  },
  sortStems: function(stemmedResults) {
    var sortedStems = stemmedResults.sort(function(a, b) {
      return b.stemmedFrequency - a.stemmedFrequency
    });
    return sortedStems;
  },
  extractKeywords: function(numKeywords, context) {
    var results = this.analyzeTicket(context);
    console.log('analyzeTicket results: ', results);
    // Get the top X keywords from result 
    // (where X = numKeywords and keywords are unstemmed)
    var topKeywords = _.map(_.first(results, numKeywords), this.unstemKeywords, this);

    // todo: @feature_enhancement return alternatives so user can see different forms of the word (8)
    // return the most common keyword without alternatives
    return _.pluck(topKeywords, 'keyword');
  },
  // returns all items in arr that are the max 
  // (needed in case there are multiple items with the same max value) 
  multiplemax: function(arr, compare) {
    var groups = _.groupBy(arr, compare);
    var keys = _.keys(groups);
    var max = _.max(keys);
    return groups[max];
  },
  // Gets the most frequent original term and its alternatives from the analyzed stems
  unstemKeywords: function(analyzedStem) {
    // Get the most frequent original Term for 
    var topTerms = this.multiplemax(analyzedStem.originalTerms, function(origTerm) {
      return origTerm.frequency;
    });
    if (topTerms.length == 1) { // only 1 most frequent original term
      return { // return the keyword with its alternative forms
        keyword: _.first(topTerms).term,
        alternatives: _.difference(analyzedStem.originalTerms, _.first(topTerms))
      }
    } else { // if max frequency of original terms is tied
      // pick the shortest original word
      var keyword = _.min(topTerms, function(origWord) {
        return origWord.term.length;
      });
      return { // return keyword along with its alternative forms
        keyword: keyword.term,
        alternatives: _.difference(analyzedStem.originalTerms, keyword)
      }
    }
  }
};
